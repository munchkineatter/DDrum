// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCBWZroPcJHnIrIFBdemvrI4AcKSFu7LH8",
  authDomain: "ddrum-87740.firebaseapp.com",
  projectId: "ddrum-87740",
  storageBucket: "ddrum-87740.firebasestorage.app",
  messagingSenderId: "77160024419",
  appId: "1:77160024419:web:16fdfbddc7afd5d26d6b56",
  measurementId: "G-G9JSNTNQG3"
};

// Firebase instance and references
let app;
let db;
let analytics;

// Initialize Firebase when the document is ready
document.addEventListener('DOMContentLoaded', function() {
  initializeFirebase();
});

// Initialize Firebase
function initializeFirebase() {
  try {
    app = firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    analytics = firebase.analytics();
    console.log("Firebase initialized successfully");
  } catch (error) {
    console.error("Error initializing Firebase:", error);
  }
}

// Firebase utility functions for plans
const firebasePlans = {
  // Save a plan to Firestore
  savePlan: async function(plan) {
    try {
      await db.collection("plans").doc(plan.name).set(plan);
      console.log(`Plan "${plan.name}" saved to Firebase`);
      return true;
    } catch (error) {
      console.error("Error saving plan to Firebase:", error);
      return false;
    }
  },
  
  // Get all plans from Firestore
  getAllPlans: async function() {
    try {
      const snapshot = await db.collection("plans").get();
      const plans = [];
      
      snapshot.forEach(doc => {
        plans.push(doc.data());
      });
      
      console.log(`Retrieved ${plans.length} plans from Firebase`);
      return plans;
    } catch (error) {
      console.error("Error getting plans from Firebase:", error);
      return [];
    }
  },
  
  // Get a specific plan by name
  getPlan: async function(planName) {
    try {
      const doc = await db.collection("plans").doc(planName).get();
      
      if (doc.exists) {
        console.log(`Plan "${planName}" retrieved from Firebase`);
        return doc.data();
      } else {
        console.log(`Plan "${planName}" not found in Firebase`);
        return null;
      }
    } catch (error) {
      console.error("Error getting plan from Firebase:", error);
      return null;
    }
  },
  
  // Delete a plan from Firestore
  deletePlan: async function(planName) {
    try {
      await db.collection("plans").doc(planName).delete();
      console.log(`Plan "${planName}" deleted from Firebase`);
      return true;
    } catch (error) {
      console.error("Error deleting plan from Firebase:", error);
      return false;
    }
  },
  
  // Set active plan
  setActivePlan: async function(plan) {
    try {
      // Store the active plan in a special document
      await db.collection("config").doc("activePlan").set({
        planName: plan.name,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.log(`Active plan set to "${plan.name}" in Firebase`);
      return true;
    } catch (error) {
      console.error("Error setting active plan in Firebase:", error);
      return false;
    }
  },
  
  // Get active plan
  getActivePlan: async function() {
    try {
      const doc = await db.collection("config").doc("activePlan").get();
      
      if (doc.exists) {
        const activePlanData = doc.data();
        const planName = activePlanData.planName;
        
        if (planName) {
          return await this.getPlan(planName);
        }
      }
      
      console.log("No active plan found in Firebase");
      return null;
    } catch (error) {
      console.error("Error getting active plan from Firebase:", error);
      return null;
    }
  }
};

// Firebase utility functions for winners
const firebaseWinners = {
  // Save a winner to Firestore
  saveWinner: async function(winner) {
    try {
      const winnerId = winner.drawingTime; // Use drawingTime as a unique ID
      await db.collection("winners").doc(winnerId).set(winner);
      console.log(`Winner saved to Firebase`);
      return true;
    } catch (error) {
      console.error("Error saving winner to Firebase:", error);
      return false;
    }
  },
  
  // Get all winners from Firestore
  getAllWinners: async function() {
    try {
      const snapshot = await db.collection("winners").get();
      const winners = [];
      
      snapshot.forEach(doc => {
        winners.push(doc.data());
      });
      
      console.log(`Retrieved ${winners.length} winners from Firebase`);
      return winners;
    } catch (error) {
      console.error("Error getting winners from Firebase:", error);
      return [];
    }
  },
  
  // Update a winner's status
  updateWinnerStatus: async function(winnerId, status) {
    try {
      await db.collection("winners").doc(winnerId).update(status);
      console.log(`Winner status updated in Firebase`);
      return true;
    } catch (error) {
      console.error("Error updating winner status in Firebase:", error);
      return false;
    }
  },
  
  // Delete a winner from Firestore
  deleteWinner: async function(winnerId) {
    try {
      await db.collection("winners").doc(winnerId).delete();
      console.log(`Winner deleted from Firebase`);
      return true;
    } catch (error) {
      console.error("Error deleting winner from Firebase:", error);
      return false;
    }
  },
  
  // Clear all winners
  clearAllWinners: async function() {
    try {
      const batch = db.batch();
      const snapshot = await db.collection("winners").get();
      
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log("All winners cleared from Firebase");
      return true;
    } catch (error) {
      console.error("Error clearing winners from Firebase:", error);
      return false;
    }
  }
}; 