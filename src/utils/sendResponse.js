const defaultMessages = {
  200: "Request successful",
  201: "Resource created successfully",
};

module.exports = {
  sendResponse(res, data, status = 200, message = null) {
    const payload = { success: true, data };
    payload.message = message || defaultMessages[status] || "Success";
    res.status(status).json(payload);
  },
};
