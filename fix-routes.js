// Completely new phone number release endpoint
// Replace in the routes.ts file between the "/api/phone-numbers/:id" endpoint
// and the "/api/phone-numbers/:id/assign" endpoint

  app.delete("/api/phone-numbers/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      const phoneNumberId = parseInt(req.params.id);
      
      if (isNaN(phoneNumberId)) {
        return res.status(400).json({ message: "Invalid phone number ID" });
      }
      
      // Get the phone number
      const phoneNumber = await storage.getPhoneNumber(phoneNumberId);
      
      if (!phoneNumber) {
        return res.status(404).json({ message: "Phone number not found" });
      }
      
      // Verify the user owns this phone number
      if (phoneNumber.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to remove this phone number" });
      }
      
      // Simply delete from our database
      const success = await storage.deletePhoneNumber(phoneNumberId);
      
      if (success) {
        console.log(`Successfully deleted phone number ${phoneNumber.number} from database`);
        return res.status(200).json({ 
          message: "Phone number successfully removed",
          number: phoneNumber.number
        });
      } else {
        return res.status(500).json({ message: "Failed to delete phone number from database" });
      }
    } catch (error) {
      console.error("Error removing phone number:", error);
      res.status(500).json({ 
        message: "Failed to remove phone number", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });