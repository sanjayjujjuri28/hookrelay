// =========================================================
// HOOKRELAY DASHBOARD CONTROLLER
// Complete implementation connecting all UI elements to API
// =========================================================

let currentUser = null;
let cachedWebhooks = [];
let cachedDeliveries = [];
let currentDeliveryPage = 1;
const deliveryLimit = 10;
let currentStatusFilter = "";
let currentInspectingDeliveryId = null;
let confirmCallback = null;

// =========================================================
// INITIALIZATION
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
    initDashboard();
});

async function initDashboard() {
    setupNavigation();
    setupModals();
    setupEventHandlers();
    await loadInitialData();
}

async function loadInitialData() {
    try {
        // 1. Authenticate user
        currentUser = await API.get("/auth/me");
        if (!currentUser) return;

        // Set user info
        const userEmailEl = document.getElementById("userEmail");
        const userAvatarEl = document.getElementById("userAvatar");
        if (userEmailEl) userEmailEl.textContent = currentUser.email;
        if (userAvatarEl && currentUser.email) {
            userAvatarEl.textContent = currentUser.email.charAt(0).toUpperCase();
        }

        // 2. Fetch webhooks & deliveries concurrently
        await Promise.all([
            loadWebhooks(),
            loadDeliveries(1, currentStatusFilter)
        ]);

    } catch (error) {
        console.error("Dashboard initialization error:", error);
        showToast(error.message || "Failed to load dashboard data", "error");
    }
}

// =========================================================
// NAVIGATION (TABS)
// =========================================================

function setupNavigation() {
    const navItems = document.querySelectorAll(".nav-item[data-section]");
    const sections = {
        overview: document.getElementById("overviewSection"),
        webhooks: document.getElementById("webhooksSection"),
        deliveries: document.getElementById("deliveriesSection")
    };

    const titleMap = {
        overview: { title: "Overview", eyebrow: "CONTROL CENTER" },
        webhooks: { title: "Webhooks", eyebrow: "ENDPOINT MANAGEMENT" },
        deliveries: { title: "Deliveries", eyebrow: "EVENT ACTIVITY" }
    };

    navItems.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetSection = btn.getAttribute("data-section");
            switchTab(targetSection);
        });
    });

    const viewWebhooksBtn = document.getElementById("viewWebhooksBtn");
    if (viewWebhooksBtn) {
        viewWebhooksBtn.addEventListener("click", () => switchTab("webhooks"));
    }

    const viewDeliveriesBtn = document.getElementById("viewDeliveriesBtn");
    if (viewDeliveriesBtn) {
        viewDeliveriesBtn.addEventListener("click", () => switchTab("deliveries"));
    }

    function switchTab(sectionKey) {
        navItems.forEach(item => {
            if (item.getAttribute("data-section") === sectionKey) {
                item.classList.add("active");
            } else {
                item.classList.remove("active");
            }
        });

        Object.keys(sections).forEach(key => {
            if (sections[key]) {
                if (key === sectionKey) {
                    sections[key].classList.add("active");
                } else {
                    sections[key].classList.remove("active");
                }
            }
        });

        const meta = titleMap[sectionKey] || { title: "Dashboard", eyebrow: "CONTROL CENTER" };
        const pageTitle = document.getElementById("pageTitle");
        const pageEyebrow = document.getElementById("pageEyebrow");
        if (pageTitle) pageTitle.textContent = meta.title;
        if (pageEyebrow) pageEyebrow.textContent = meta.eyebrow;
    }
}

// =========================================================
// WEBHOOKS MANAGEMENT
// =========================================================

async function loadWebhooks() {
    try {
        const webhooks = await API.get("/webhooks/");
        cachedWebhooks = webhooks || [];

        // Update Stat Card
        const webhookCountEl = document.getElementById("webhookCount");
        if (webhookCountEl) {
            webhookCountEl.textContent = cachedWebhooks.length;
        }

        renderOverviewWebhooks(cachedWebhooks);
        renderAllWebhooks(cachedWebhooks);
        updateWebhookSelectOptions(cachedWebhooks);

    } catch (error) {
        console.error("Failed to load webhooks:", error);
        showToast("Error loading webhooks", "error");
    }
}

function renderOverviewWebhooks(webhooks) {
    const container = document.getElementById("webhookList");
    if (!container) return;

    if (webhooks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">◈</div>
                <h3>No webhooks yet</h3>
                <p>Create your first webhook endpoint to start routing signed events.</p>
                <button class="primary-btn" onclick="openCreateWebhookModal()">
                    + Create webhook
                </button>
            </div>
        `;
        return;
    }

    // Show recent 4
    const recent = webhooks.slice(0, 4);
    container.innerHTML = recent.map(wh => `
        <div class="webhook-card">
            <div class="webhook-main">
                <div class="webhook-icon">◈</div>
                <div>
                    <h3>${escapeHtml(wh.name)}</h3>
                    <p style="font-family:'SF Mono', monospace; font-size:11px;">${escapeHtml(wh.target_url)}</p>
                </div>
            </div>

            <div style="display:flex; align-items:center; gap:12px;">
                <span class="status-badge ${wh.is_active ? 'success' : 'failed'}">
                    ${wh.is_active ? 'Active' : 'Inactive'}
                </span>
                <button class="action-btn primary" onclick="openTestEventModal(${wh.id})">
                    ⚡ Test
                </button>
            </div>
        </div>
    `).join("");
}

function renderAllWebhooks(webhooks) {
    const container = document.getElementById("allWebhooks");
    if (!container) return;

    if (webhooks.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-icon">◈</div>
                <h3>No endpoints created</h3>
                <p>Add your application's destination URL to receive webhook payloads.</p>
                <button class="primary-btn" onclick="openCreateWebhookModal()">
                    + Create webhook
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = webhooks.map(wh => `
        <div class="webhook-card-detailed">
            <div class="webhook-header">
                <div class="webhook-title-group">
                    <h3>${escapeHtml(wh.name)}</h3>
                    <span class="status-badge ${wh.is_active ? 'success' : 'failed'}">
                        ${wh.is_active ? '● Active' : '○ Inactive'}
                    </span>
                </div>
                <button class="action-btn primary" onclick="openTestEventModal(${wh.id})" title="Send test event">
                    ⚡ Test
                </button>
            </div>

            <div>
                <label style="font-size:10px; color:var(--muted); display:block; margin-bottom:4px;">DESTINATION URL</label>
                <div class="webhook-url">${escapeHtml(wh.target_url)}</div>
            </div>

            <div class="webhook-meta">
                <span>ID: #${wh.id}</span>
                <div class="webhook-actions">
                    <button class="action-btn" onclick="openEditWebhookModal(${wh.id})">
                        ✏️ Edit
                    </button>
                    <button class="action-btn" onclick="confirmRegenerateSecret(${wh.id}, '${escapeHtml(wh.name)}')">
                        🔄 Rotate Secret
                    </button>
                    <button class="action-btn danger" onclick="confirmDeleteWebhook(${wh.id}, '${escapeHtml(wh.name)}')">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        </div>
    `).join("");
}

function updateWebhookSelectOptions(webhooks) {
    const select = document.getElementById("testWebhookSelect");
    if (!select) return;

    if (webhooks.length === 0) {
        select.innerHTML = `<option value="">No webhooks available - create one first</option>`;
        return;
    }

    select.innerHTML = webhooks.map(wh => `
        <option value="${wh.id}">
            #${wh.id} — ${escapeHtml(wh.name)} (${wh.is_active ? 'Active' : 'Inactive'})
        </option>
    `).join("");
}

// =========================================================
// DELIVERIES MANAGEMENT
// =========================================================

async function loadDeliveries(page = 1, status = "") {
    try {
        currentDeliveryPage = page;
        currentStatusFilter = status;

        let query = `/deliveries/?page=${page}&limit=${deliveryLimit}`;
        if (status) {
            query += `&status=${encodeURIComponent(status)}`;
        }

        const data = await API.get(query);
        cachedDeliveries = data.deliveries || [];
        const total = data.total || 0;

        // Update Stat Cards (if fetching all)
        if (!status) {
            const deliveryCountEl = document.getElementById("deliveryCount");
            if (deliveryCountEl) deliveryCountEl.textContent = total;

            const successful = cachedDeliveries.filter(d => d.status === "success").length;
            const failed = cachedDeliveries.filter(d => d.status === "failed").length;

            const successCountEl = document.getElementById("successCount");
            const failedCountEl = document.getElementById("failedCount");
            if (successCountEl) successCountEl.textContent = successful;
            if (failedCountEl) failedCountEl.textContent = failed;
        }

        renderOverviewDeliveries(cachedDeliveries);
        renderDeliveriesTable(cachedDeliveries, total, page);

    } catch (error) {
        console.error("Failed to load deliveries:", error);
        showToast("Error loading deliveries", "error");
    }
}

function renderOverviewDeliveries(deliveries) {
    const tbody = document.getElementById("overviewDeliveryTableBody");
    if (!tbody) return;

    if (deliveries.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding: 24px; color:var(--muted);">
                    No deliveries logged yet. Send a test event to see activity.
                </td>
            </tr>
        `;
        return;
    }

    const recent = deliveries.slice(0, 5);
    tbody.innerHTML = recent.map(d => `
        <tr>
            <td><strong style="color:#dce0e8;">#${d.id}</strong></td>
            <td>
                <span style="font-weight:600; color:var(--text);">${escapeHtml(d.webhook_name || 'Webhook #' + d.webhook_id)}</span>
            </td>
            <td>
                <span class="status-badge ${d.status}">${escapeHtml(d.status)}</span>
            </td>
            <td>
                ${formatStatusCode(d.status_code)}
            </td>
            <td>#${d.attempt_number}</td>
            <td style="color:var(--muted);">${formatDate(d.created_at)}</td>
            <td>
                <button class="action-btn" onclick="inspectDelivery(${d.id})">
                    Inspect
                </button>
            </td>
        </tr>
    `).join("");
}

function renderDeliveriesTable(deliveries, total, page) {
    const tbody = document.getElementById("deliveryTableBody");
    if (!tbody) return;

    if (deliveries.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center; padding: 34px; color:var(--muted);">
                    No deliveries found for the selected filter.
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = deliveries.map(d => `
            <tr>
                <td><strong style="color:#dce0e8;">#${d.id}</strong></td>
                <td>
                    <span style="font-weight:600; color:var(--text);">${escapeHtml(d.webhook_name || 'Endpoint #' + d.webhook_id)}</span>
                </td>
                <td style="font-family:'SF Mono', monospace; font-size:11px; color:var(--muted); max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    ${escapeHtml(d.target_url || '-')}
                </td>
                <td>
                    <span class="status-badge ${d.status}">${escapeHtml(d.status)}</span>
                </td>
                <td>
                    ${formatStatusCode(d.status_code)}
                </td>
                <td>#${d.attempt_number}</td>
                <td style="color:var(--muted);">${formatDate(d.created_at)}</td>
                <td>
                    <div style="display:flex; gap:6px;">
                        <button class="action-btn" onclick="inspectDelivery(${d.id})">
                            Inspect
                        </button>
                        <button class="action-btn primary" onclick="retryDelivery(${d.id})">
                            ↻ Retry
                        </button>
                    </div>
                </td>
            </tr>
        `).join("");
    }

    // Pagination update
    const totalPages = Math.ceil(total / deliveryLimit) || 1;
    const paginationInfo = document.getElementById("paginationInfo");
    const prevBtn = document.getElementById("prevPageBtn");
    const nextBtn = document.getElementById("nextPageBtn");

    if (paginationInfo) {
        const start = total === 0 ? 0 : (page - 1) * deliveryLimit + 1;
        const end = Math.min(page * deliveryLimit, total);
        paginationInfo.textContent = `Showing ${start}–${end} of ${total} deliveries (Page ${page} of ${totalPages})`;
    }

    if (prevBtn) prevBtn.disabled = (page <= 1);
    if (nextBtn) nextBtn.disabled = (page >= totalPages);
}

// =========================================================
// DELIVERY RETRY & INSPECTION
// =========================================================

async function retryDelivery(deliveryId) {
    try {
        showToast(`Retrying delivery #${deliveryId}...`, "info");
        const res = await API.post(`/deliveries/${deliveryId}/retry`, {});

        showToast(`Retry complete: ${res.status.toUpperCase()} (${res.status_code || 'Err'})`, res.status === "success" ? "success" : "error");

        // Reload table
        await loadDeliveries(currentDeliveryPage, currentStatusFilter);

        // If inspecting this delivery, refresh details
        if (currentInspectingDeliveryId === deliveryId) {
            await inspectDelivery(deliveryId);
        }

    } catch (error) {
        console.error("Retry failed:", error);
        showToast(error.message || "Failed to retry delivery", "error");
    }
}

async function inspectDelivery(deliveryId) {
    try {
        currentInspectingDeliveryId = deliveryId;
        const d = await API.get(`/deliveries/${deliveryId}`);

        document.getElementById("inspectModalTitle").textContent = `Delivery #${d.id} — ${d.webhook_name || 'Webhook #' + d.webhook_id}`;
        document.getElementById("inspectModalSubtitle").textContent = `Target: ${d.target_url || 'Unknown'}`;

        const badge = document.getElementById("inspectStatusBadge");
        badge.className = `status-badge ${d.status}`;
        badge.textContent = d.status;

        const codeEl = document.getElementById("inspectStatusCode");
        codeEl.innerHTML = formatStatusCode(d.status_code);

        const attemptEl = document.getElementById("inspectAttempt");
        attemptEl.textContent = `Attempt #${d.attempt_number}`;

        const errorContainer = document.getElementById("inspectErrorContainer");
        const errorMsgEl = document.getElementById("inspectErrorMessage");
        if (d.error_message) {
            errorContainer.style.display = "block";
            errorMsgEl.textContent = `Error: ${d.error_message}`;
        } else {
            errorContainer.style.display = "none";
        }

        const payloadViewer = document.getElementById("inspectPayloadViewer");
        payloadViewer.textContent = JSON.stringify(d.event_payload, null, 2);

        // Wire Retry inside modal
        const retryBtn = document.getElementById("inspectRetryBtn");
        retryBtn.onclick = () => retryDelivery(deliveryId);

        openModal("inspectDeliveryModal");

    } catch (error) {
        console.error("Failed to inspect delivery:", error);
        showToast("Error inspecting delivery", "error");
    }
}

// =========================================================
// EVENT HANDLERS & MODALS
// =========================================================

function setupModals() {
    // Generic modal close buttons
    document.querySelectorAll(".modal-close").forEach(btn => {
        btn.addEventListener("click", () => {
            const modal = btn.closest(".modal");
            if (modal) closeModal(modal.id);
        });
    });

    // Close on backdrop click
    document.querySelectorAll(".modal").forEach(modal => {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });

    // Close on Escape key
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            document.querySelectorAll(".modal:not(.hidden)").forEach(modal => {
                closeModal(modal.id);
            });
        }
    });

    // Dismiss buttons
    const dismissSecretBtn = document.getElementById("dismissSecretModalBtn");
    if (dismissSecretBtn) {
        dismissSecretBtn.addEventListener("click", () => closeModal("secretModal"));
    }

    const dismissInspectBtn = document.getElementById("dismissInspectBtn");
    if (dismissInspectBtn) {
        dismissInspectBtn.addEventListener("click", () => closeModal("inspectDeliveryModal"));
    }

    // Local receiver helper
    const useTestReceiverBtn = document.getElementById("useTestReceiverBtn");
    if (useTestReceiverBtn) {
        useTestReceiverBtn.addEventListener("click", () => {
            const targetInput = document.getElementById("targetUrl");
            if (targetInput) {
                targetInput.value = `${window.location.origin}/test-receiver`;
            }
        });
    }

    // Copy new secret
    const copyNewSecretBtn = document.getElementById("copyNewSecretBtn");
    if (copyNewSecretBtn) {
        copyNewSecretBtn.addEventListener("click", () => {
            const val = document.getElementById("newSecretValue").textContent;
            copyToClipboard(val, "Webhook secret copied to clipboard!");
        });
    }

    // Copy inspected payload
    const copyInspectPayloadBtn = document.getElementById("copyInspectPayloadBtn");
    if (copyInspectPayloadBtn) {
        copyInspectPayloadBtn.addEventListener("click", () => {
            const text = document.getElementById("inspectPayloadViewer").textContent;
            copyToClipboard(text, "Payload JSON copied to clipboard!");
        });
    }
}

function setupEventHandlers() {
    // 1. Create Webhook Button & Form
    const openCreateBtns = [
        document.getElementById("createWebhookBtn"),
        document.getElementById("createWebhookBtn2")
    ];
    openCreateBtns.forEach(btn => {
        if (btn) btn.addEventListener("click", openCreateWebhookModal);
    });

    const webhookForm = document.getElementById("webhookForm");
    if (webhookForm) {
        webhookForm.addEventListener("submit", handleCreateWebhookSubmit);
    }

    // Webhook search input filter
    const searchInput = document.getElementById("webhookSearchInput");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (!query) {
                renderAllWebhooks(cachedWebhooks);
                return;
            }
            const filtered = cachedWebhooks.filter(wh =>
                (wh.name && wh.name.toLowerCase().includes(query)) ||
                (wh.target_url && wh.target_url.toLowerCase().includes(query))
            );
            renderAllWebhooks(filtered);
        });
    }

    // 2. Edit Webhook Form
    const editWebhookForm = document.getElementById("editWebhookForm");
    if (editWebhookForm) {
        editWebhookForm.addEventListener("submit", handleEditWebhookSubmit);
    }


    // 3. Test Event Modal & Form
    const openTestBtn = document.getElementById("openTestModalBtn");
    if (openTestBtn) {
        openTestBtn.addEventListener("click", () => openTestEventModal());
    }

    const templateSelect = document.getElementById("testEventTemplate");
    if (templateSelect) {
        templateSelect.addEventListener("change", handleTemplateChange);
    }

    const testEventForm = document.getElementById("testEventForm");
    if (testEventForm) {
        testEventForm.addEventListener("submit", handleSendTestEventSubmit);
    }

    // 4. Refresh Button
    const refreshBtn = document.getElementById("refreshBtn");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", async () => {
            refreshBtn.disabled = true;
            showToast("Refreshing data...", "info");
            await Promise.all([
                loadWebhooks(),
                loadDeliveries(currentDeliveryPage, currentStatusFilter)
            ]);
            refreshBtn.disabled = false;
            showToast("Dashboard data updated", "success");
        });
    }

    // 5. Status Filter
    const statusFilter = document.getElementById("statusFilter");
    if (statusFilter) {
        statusFilter.addEventListener("change", (e) => {
            loadDeliveries(1, e.target.value);
        });
    }

    // 6. Pagination buttons
    const prevBtn = document.getElementById("prevPageBtn");
    if (prevBtn) {
        prevBtn.addEventListener("click", () => {
            if (currentDeliveryPage > 1) {
                loadDeliveries(currentDeliveryPage - 1, currentStatusFilter);
            }
        });
    }

    const nextBtn = document.getElementById("nextPageBtn");
    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            loadDeliveries(currentDeliveryPage + 1, currentStatusFilter);
        });
    }

    // 7. Logout Button
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem("access_token");
            window.location.href = "/login.html";
        });
    }

    // 8. Confirmation Dialog Buttons
    const confirmCancelBtn = document.getElementById("confirmCancelBtn");
    if (confirmCancelBtn) {
        confirmCancelBtn.addEventListener("click", () => closeModal("confirmModal"));
    }

    const confirmOkBtn = document.getElementById("confirmOkBtn");
    if (confirmOkBtn) {
        confirmOkBtn.addEventListener("click", async () => {
            if (confirmCallback) {
                confirmOkBtn.disabled = true;
                await confirmCallback();
                confirmOkBtn.disabled = false;
                closeModal("confirmModal");
            }
        });
    }
}

// =========================================================
// FORM ACTIONS: CREATE, EDIT, ROTATE, DELETE, TEST
// =========================================================

function openCreateWebhookModal() {
    const form = document.getElementById("webhookForm");
    if (form) form.reset();
    openModal("webhookModal");
    document.getElementById("webhookName")?.focus();
}

async function handleCreateWebhookSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById("createWebhookSubmitBtn");
    btn.disabled = true;
    btn.textContent = "Creating...";

    const name = document.getElementById("webhookName").value.trim();
    const targetUrl = document.getElementById("targetUrl").value.trim();

    try {
        const res = await API.post("/webhooks/", {
            name,
            target_url: targetUrl
        });

        closeModal("webhookModal");
        showToast("Webhook endpoint created successfully!", "success");

        // Show secret modal
        document.getElementById("newSecretValue").textContent = res.secret;
        openModal("secretModal");

        // Reload data
        await loadWebhooks();

    } catch (error) {
        console.error("Create webhook error:", error);
        showToast(error.message || "Failed to create webhook", "error");
    } finally {
        btn.disabled = false;
        btn.textContent = "Create webhook";
    }
}

function openEditWebhookModal(webhookId) {
    const wh = cachedWebhooks.find(w => w.id === webhookId);
    if (!wh) return;

    document.getElementById("editWebhookId").value = wh.id;
    document.getElementById("editWebhookName").value = wh.name;
    document.getElementById("editTargetUrl").value = wh.target_url;
    document.getElementById("editIsActive").checked = wh.is_active;

    openModal("editWebhookModal");
}

async function handleEditWebhookSubmit(e) {
    e.preventDefault();

    const id = document.getElementById("editWebhookId").value;
    const name = document.getElementById("editWebhookName").value.trim();
    const targetUrl = document.getElementById("editTargetUrl").value.trim();
    const isActive = document.getElementById("editIsActive").checked;

    try {
        await API.put(`/webhooks/${id}`, {
            name,
            target_url: targetUrl,
            is_active: isActive
        });

        closeModal("editWebhookModal");
        showToast("Webhook updated successfully!", "success");
        await loadWebhooks();

    } catch (error) {
        console.error("Edit webhook error:", error);
        showToast(error.message || "Failed to update webhook", "error");
    }
}

function confirmDeleteWebhook(webhookId, webhookName) {
    showConfirmDialog(
        `Delete "${webhookName}"?`,
        "This will permanently delete this webhook endpoint and all associated delivery attempt history.",
        "DELETE ENDPOINT",
        async () => {
            try {
                await API.delete(`/webhooks/${webhookId}`);
                showToast("Webhook deleted successfully", "success");
                await Promise.all([
                    loadWebhooks(),
                    loadDeliveries(1, currentStatusFilter)
                ]);
            } catch (error) {
                showToast(error.message || "Failed to delete webhook", "error");
            }
        }
    );
}

function confirmRegenerateSecret(webhookId, webhookName) {
    showConfirmDialog(
        `Rotate secret for "${webhookName}"?`,
        "This will invalidate the current webhook secret. Outgoing webhook signatures will immediately use the new secret.",
        "ROTATE SECRET",
        async () => {
            try {
                const res = await API.post(`/webhooks/${webhookId}/regenerate-secret`, {});
                showToast("Webhook secret rotated successfully", "success");

                document.getElementById("newSecretValue").textContent = res.secret;
                openModal("secretModal");
            } catch (error) {
                showToast(error.message || "Failed to regenerate secret", "error");
            }
        }
    );
}

function openTestEventModal(preselectedWebhookId = null) {
    if (cachedWebhooks.length === 0) {
        showToast("Please create a webhook endpoint first before sending test events", "info");
        openCreateWebhookModal();
        return;
    }

    const select = document.getElementById("testWebhookSelect");
    if (select && preselectedWebhookId) {
        select.value = preselectedWebhookId;
    }

    handleTemplateChange();
    openModal("testEventModal");
}

function handleTemplateChange() {
    const template = document.getElementById("testEventTemplate").value;
    const textarea = document.getElementById("testEventPayload");

    const templates = {
        ping: {
            event: "hookrelay.ping",
            timestamp: new Date().toISOString(),
            data: {
                message: "Hello from HookRelay!",
                status: "operational",
                environment: "development"
            }
        },
        payment: {
            event: "payment.succeeded",
            timestamp: new Date().toISOString(),
            data: {
                charge_id: "ch_" + Math.random().toString(36).substring(2, 10),
                amount: 4900,
                currency: "USD",
                customer_email: currentUser ? currentUser.email : "customer@example.com",
                paid: true
            }
        },
        user_signup: {
            event: "user.created",
            timestamp: new Date().toISOString(),
            data: {
                user_id: "usr_" + Math.floor(Math.random() * 10000),
                email: "newuser@example.com",
                plan: "developer_pro"
            }
        },
        order: {
            event: "order.completed",
            timestamp: new Date().toISOString(),
            data: {
                order_id: "ord_" + Math.floor(Math.random() * 100000),
                items: [
                    { item: "Webhook Pro License", qty: 1, price: 99.00 }
                ],
                total: 99.00
            }
        }
    };

    textarea.value = JSON.stringify(templates[template] || templates.ping, null, 2);
}

async function handleSendTestEventSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById("sendTestSubmitBtn");
    const webhookId = document.getElementById("testWebhookSelect").value;
    const payloadText = document.getElementById("testEventPayload").value;

    if (!webhookId) {
        showToast("Please select a webhook endpoint", "error");
        return;
    }

    let parsedPayload;
    try {
        parsedPayload = JSON.parse(payloadText);
    } catch (err) {
        showToast("Invalid JSON payload format", "error");
        return;
    }

    btn.disabled = true;
    btn.textContent = "Dispatching...";

    try {
        const res = await API.post(`/events/${webhookId}`, parsedPayload);
        closeModal("testEventModal");
        showToast("Event queued for delivery! ⚡", "success");

        // Wait slightly for background worker, then reload deliveries
        setTimeout(async () => {
            await loadDeliveries(1, currentStatusFilter);
        }, 600);

    } catch (error) {
        console.error("Send test event error:", error);
        showToast(error.message || "Failed to dispatch test event", "error");
    } finally {
        btn.disabled = false;
        btn.textContent = "Dispatch event now ⚡";
    }
}

// =========================================================
// HELPERS & UI UTILITIES
// =========================================================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove("hidden");
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add("hidden");
}

function showConfirmDialog(title, message, eyebrow, onConfirm) {
    document.getElementById("confirmTitle").textContent = title;
    document.getElementById("confirmMessage").textContent = message;
    document.getElementById("confirmEyebrow").textContent = eyebrow || "CONFIRM ACTION";
    confirmCallback = onConfirm;
    openModal("confirmModal");
}

function showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    const iconMap = {
        success: "✓",
        error: "✕",
        info: "ℹ"
    };

    toast.innerHTML = `
        <span style="font-weight:700;">${iconMap[type] || '•'}</span>
        <span style="flex:1;">${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(10px) scale(0.95)";
        setTimeout(() => toast.remove(), 250);
    }, 3500);
}

function copyToClipboard(text, successToastMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast(successToastMsg || "Copied to clipboard!", "success");
        }).catch(() => fallbackCopy(text, successToastMsg));
    } else {
        fallbackCopy(text, successToastMsg);
    }
}

function fallbackCopy(text, successToastMsg) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand("copy");
        showToast(successToastMsg || "Copied to clipboard!", "success");
    } catch (e) {
        showToast("Failed to copy", "error");
    }
    document.body.removeChild(ta);
}

function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    const div = document.createElement("div");
    div.textContent = String(value);
    return div.innerHTML;
}

function formatDate(isoString) {
    if (!isoString) return "-";
    try {
        const d = new Date(isoString);
        return d.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    } catch (e) {
        return isoString;
    }
}

function formatStatusCode(code) {
    if (code === null || code === undefined) {
        return `<span class="status-code-tag">-</span>`;
    }
    const num = Number(code);
    if (num >= 200 && num < 300) {
        return `<span class="status-code-tag code-2xx">${num} OK</span>`;
    }
    if (num >= 400 && num < 500) {
        return `<span class="status-code-tag code-4xx">${num} Client Err</span>`;
    }
    return `<span class="status-code-tag code-5xx">${num} Server Err</span>`;
}