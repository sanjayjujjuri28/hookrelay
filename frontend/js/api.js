const API = {

    async request(url, options = {}) {

        const token =
            localStorage.getItem("access_token");

        const headers = {
            ...(options.headers || {})
        };

        if (token) {
            headers["Authorization"] =
                `Bearer ${token}`;
        }

        if (
            options.body &&
            !(options.body instanceof FormData)
        ) {
            headers["Content-Type"] =
                "application/json";
        }

        const response = await fetch(
            url,
            {
                ...options,
                headers
            }
        );

        /*
         * JWT expired / invalid on protected pages
         */
        if (response.status === 401) {

            // Check if this was a call to /auth/login or other public route
            const isAuthRoute = url.includes("/auth/login") || url.includes("/auth/register");

            if (!isAuthRoute && (window.location.pathname.includes("dashboard") || window.location.pathname === "/")) {
                localStorage.removeItem("access_token");
                window.location.href = "/login.html";
                return;
            }
        }

        /*
         * No content
         */
        if (response.status === 204) {
            return null;
        }

        let data;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (!response.ok) {
            let errorMsg = "Request failed";
            if (typeof data === "object" && data !== null) {
                if (typeof data.detail === "string") {
                    errorMsg = data.detail;
                } else if (Array.isArray(data.detail)) {
                    errorMsg = data.detail.map(e => e.msg || e.message).join(", ");
                } else {
                    errorMsg = data.message || JSON.stringify(data);
                }
            } else if (typeof data === "string" && data.trim()) {
                errorMsg = data;
            }

            throw new Error(errorMsg);
        }

        return data;
    },

    get(url) {
        return this.request(url, {
            method: "GET"
        });
    },

    post(url, body) {
        return this.request(url, {
            method: "POST",
            body: body !== undefined ? JSON.stringify(body) : undefined
        });
    },

    put(url, body) {
        return this.request(url, {
            method: "PUT",
            body: body !== undefined ? JSON.stringify(body) : undefined
        });
    },

    delete(url) {
        return this.request(url, {
            method: "DELETE"
        });
    }
};