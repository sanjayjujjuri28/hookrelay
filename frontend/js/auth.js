// ==========================================
// HOOKRELAY AUTH HANDLERS
// Handles Login, Register, Verify, Forgot & Reset
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    initLoginForm();
    initRegisterForm();
    initVerifyForm();
    initForgotPasswordForm();
    initResetPasswordForm();
});

// Helper to show inline form messages
function showMessage(elementId, text, type = "error") {
    const el = document.getElementById(elementId);
    if (!el) return;

    el.textContent = text;
    el.className = `message show ${type}`;
}

function clearMessage(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;

    el.textContent = "";
    el.className = "message";
}

// ==========================================
// 1. LOGIN
// ==========================================
function initLoginForm() {
    const form = document.getElementById("loginForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const btn = form.querySelector("button[type='submit']");

        clearMessage("loginMessage");
        btn.disabled = true;
        const originalText = btn.textContent;
        btn.textContent = "Signing in...";

        try {
            const data = await API.post("/auth/login", {
                email,
                password
            });

            localStorage.setItem("access_token", data.access_token);
            showMessage("loginMessage", "Login successful! Redirecting to dashboard...", "success");

            setTimeout(() => {
                window.location.href = "/dashboard.html";
            }, 600);
        } catch (err) {
            console.error("Login failed:", err);
            showMessage("loginMessage", err.message || "Invalid email or password", "error");
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    });
}

// ==========================================
// 2. REGISTER
// ==========================================
function initRegisterForm() {
    const form = document.getElementById("registerForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword")?.value;
        const btn = form.querySelector("button[type='submit']");

        clearMessage("registerMessage");

        if (confirmPassword !== undefined && password !== confirmPassword) {
            showMessage("registerMessage", "Passwords do not match", "error");
            return;
        }

        if (password.length < 6) {
            showMessage("registerMessage", "Password must be at least 6 characters", "error");
            return;
        }

        btn.disabled = true;
        const originalText = btn.textContent;
        btn.textContent = "Creating account...";

        try {
            const data = await API.post("/auth/register", {
                email,
                password
            });

            sessionStorage.setItem("verify_email", email);
            if (data.dev_otp) {
                sessionStorage.setItem("dev_otp", data.dev_otp);
            }

            showMessage("registerMessage", "Account created! Redirecting to email verification...", "success");

            setTimeout(() => {
                window.location.href = `/verify.html?email=${encodeURIComponent(email)}`;
            }, 800);
        } catch (err) {
            console.error("Registration failed:", err);
            showMessage("registerMessage", err.message || "Registration failed. Email may already be in use.", "error");
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    });
}

// ==========================================
// 3. VERIFY EMAIL
// ==========================================
function initVerifyForm() {
    const form = document.getElementById("verifyForm");
    if (!form) return;

    // Prefill email from query parameter or sessionStorage
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get("email") || sessionStorage.getItem("verify_email") || "";
    const emailInput = document.getElementById("email");
    const displayEmail = document.getElementById("displayEmail");
    const otpInput = document.getElementById("otp");

    if (emailInput && emailParam) {
        emailInput.value = emailParam;
    }
    if (displayEmail && emailParam) {
        displayEmail.textContent = emailParam;
    }

    // Display OTP hint box if dev_otp is stored
    const otpHintBox = document.getElementById("otpHintBox");
    const hintOtpCode = document.getElementById("hintOtpCode");
    const autofillBtn = document.getElementById("autofillBtn");
    const resendBtn = document.getElementById("resendOtpBtn");

    function showDevOtp(code) {
        if (otpHintBox && hintOtpCode && code) {
            hintOtpCode.textContent = code;
            otpHintBox.style.display = "block";
            // Pre-fill automatically for effortless onboarding
            if (otpInput && !otpInput.value) {
                otpInput.value = code;
            }
        }
    }

    const savedOtp = sessionStorage.getItem("dev_otp");
    if (savedOtp) {
        showDevOtp(savedOtp);
    }

    if (autofillBtn) {
        autofillBtn.addEventListener("click", () => {
            const code = hintOtpCode ? hintOtpCode.textContent : sessionStorage.getItem("dev_otp");
            if (otpInput && code) {
                otpInput.value = code;
                otpInput.focus();
            }
        });
    }

    if (resendBtn) {
        resendBtn.addEventListener("click", async () => {
            const email = (emailInput ? emailInput.value : emailParam).trim();
            if (!email) {
                showMessage("verifyMessage", "Please enter your email to resend OTP", "error");
                return;
            }

            resendBtn.disabled = true;
            resendBtn.textContent = "Sending...";
            clearMessage("verifyMessage");

            try {
                const res = await API.post("/auth/resend-otp", { email });
                if (res.dev_otp) {
                    sessionStorage.setItem("dev_otp", res.dev_otp);
                    showDevOtp(res.dev_otp);
                }
                showMessage("verifyMessage", res.message || "A new verification code has been sent!", "success");
            } catch (err) {
                showMessage("verifyMessage", err.message || "Failed to resend code", "error");
            } finally {
                resendBtn.disabled = false;
                resendBtn.textContent = "Resend code";
            }
        });
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = (emailInput ? emailInput.value : emailParam).trim();
        const otp = otpInput.value.trim();
        const btn = form.querySelector("button[type='submit']");

        clearMessage("verifyMessage");

        if (!email) {
            showMessage("verifyMessage", "Please enter your email address", "error");
            return;
        }

        if (otp.length < 6) {
            showMessage("verifyMessage", "Please enter the complete 6-digit OTP code", "error");
            return;
        }

        btn.disabled = true;
        const originalText = btn.textContent;
        btn.textContent = "Verifying...";

        try {
            await API.post("/auth/verify-email", {
                email,
                otp
            });

            // Clean up session OTP
            sessionStorage.removeItem("dev_otp");
            showMessage("verifyMessage", "Email verified successfully! Redirecting to login...", "success");

            setTimeout(() => {
                window.location.href = "/login.html";
            }, 1000);
        } catch (err) {
            console.error("Verification failed:", err);
            showMessage("verifyMessage", err.message || "Invalid or expired OTP code", "error");
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    });
}

// ==========================================
// 4. FORGOT PASSWORD
// ==========================================
function initForgotPasswordForm() {
    const form = document.getElementById("forgotPasswordForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("email").value.trim();
        const btn = form.querySelector("button[type='submit']");

        clearMessage("forgotMessage");
        btn.disabled = true;
        const originalText = btn.textContent;
        btn.textContent = "Sending OTP...";

        try {
            const data = await API.post("/auth/forgot-password", {
                email
            });

            sessionStorage.setItem("reset_email", email);
            if (data.dev_otp) {
                sessionStorage.setItem("dev_otp", data.dev_otp);
            }

            showMessage("forgotMessage", data.message || "If the email exists, a password reset OTP has been sent.", "success");

            setTimeout(() => {
                window.location.href = `/reset-password.html?email=${encodeURIComponent(email)}`;
            }, 1000);
        } catch (err) {
            console.error("Forgot password request failed:", err);
            showMessage("forgotMessage", err.message || "Failed to process request", "error");
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    });
}

// ==========================================
// 5. RESET PASSWORD
// ==========================================
function initResetPasswordForm() {
    const form = document.getElementById("resetPasswordForm");
    if (!form) return;

    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get("email") || sessionStorage.getItem("reset_email") || "";
    const emailInput = document.getElementById("email");
    const displayEmail = document.getElementById("displayEmail");
    const otpInput = document.getElementById("otp");

    if (emailInput && emailParam) {
        emailInput.value = emailParam;
    }
    if (displayEmail && emailParam) {
        displayEmail.textContent = emailParam;
    }

    // Display OTP hint box
    const otpHintBox = document.getElementById("otpHintBox");
    const hintOtpCode = document.getElementById("hintOtpCode");
    const autofillBtn = document.getElementById("autofillBtn");
    const resendBtn = document.getElementById("resendResetOtpBtn");

    function showDevOtp(code) {
        if (otpHintBox && hintOtpCode && code) {
            hintOtpCode.textContent = code;
            otpHintBox.style.display = "block";
            if (otpInput && !otpInput.value) {
                otpInput.value = code;
            }
        }
    }

    const savedOtp = sessionStorage.getItem("dev_otp");
    if (savedOtp) {
        showDevOtp(savedOtp);
    }

    if (autofillBtn) {
        autofillBtn.addEventListener("click", () => {
            const code = hintOtpCode ? hintOtpCode.textContent : sessionStorage.getItem("dev_otp");
            if (otpInput && code) {
                otpInput.value = code;
                otpInput.focus();
            }
        });
    }

    if (resendBtn) {
        resendBtn.addEventListener("click", async () => {
            const email = (emailInput ? emailInput.value : emailParam).trim();
            if (!email) {
                showMessage("resetMessage", "Please enter your email", "error");
                return;
            }

            resendBtn.disabled = true;
            resendBtn.textContent = "Sending...";
            clearMessage("resetMessage");

            try {
                const res = await API.post("/auth/forgot-password", { email });
                if (res.dev_otp) {
                    sessionStorage.setItem("dev_otp", res.dev_otp);
                    showDevOtp(res.dev_otp);
                }
                showMessage("resetMessage", "A new reset code has been sent!", "success");
            } catch (err) {
                showMessage("resetMessage", err.message || "Failed to resend code", "error");
            } finally {
                resendBtn.disabled = false;
                resendBtn.textContent = "Resend code";
            }
        });
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = (emailInput ? emailInput.value : emailParam).trim();
        const otp = otpInput.value.trim();
        const newPassword = document.getElementById("newPassword").value;
        const confirmPassword = document.getElementById("confirmPassword")?.value;
        const btn = form.querySelector("button[type='submit']");

        clearMessage("resetMessage");

        if (confirmPassword !== undefined && newPassword !== confirmPassword) {
            showMessage("resetMessage", "Passwords do not match", "error");
            return;
        }

        if (newPassword.length < 6) {
            showMessage("resetMessage", "Password must be at least 6 characters", "error");
            return;
        }

        btn.disabled = true;
        const originalText = btn.textContent;
        btn.textContent = "Resetting password...";

        try {
            // Step 1: Verify OTP and receive reset_token
            const verifyRes = await API.post("/auth/verify-reset-otp", {
                email,
                otp
            });

            const resetToken = verifyRes.reset_token;
            if (!resetToken) {
                throw new Error("Unable to obtain reset token. Please request a new OTP.");
            }

            // Step 2: Submit new password with reset_token
            await API.post("/auth/reset-password", {
                email,
                reset_token: resetToken,
                new_password: newPassword
            });

            sessionStorage.removeItem("dev_otp");
            showMessage("resetMessage", "Password has been reset successfully! Redirecting to sign in...", "success");

            setTimeout(() => {
                window.location.href = "/login.html";
            }, 1200);
        } catch (err) {
            console.error("Password reset failed:", err);
            showMessage("resetMessage", err.message || "Failed to reset password. Please check your OTP.", "error");
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    });
}