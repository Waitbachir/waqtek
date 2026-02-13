const AdminController = {
  async getUsers(req, res) {
    // Temporary: return empty user list
    res.json([]);
  },

  async updateUserRole(req, res) {
    // Temporary: pretend role updated
    res.json({ success: true });
  }
};

export default AdminController;



