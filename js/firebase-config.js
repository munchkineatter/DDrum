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
let firebaseInitialized = false;

// Initialize Firebase when the document is ready
document.addEventListener('DOMContentLoaded', function() {
  initializeFirebase();
});

// Initialize Firebase
function initializeFirebase() {
  try {
    console.log("Attempting to initialize Firebase...");
    app = firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    analytics = firebase.analytics();
    firebaseInitialized = true;
    console.log("✅ Firebase initialized successfully");
    
    // Make Firebase objects globally accessible for debugging
    window.firebase = firebase;
    window.db = db;
    window.firebaseApp = app;
    window.firebaseInitialized = firebaseInitialized;
    
    // Test database connection
    testDatabaseConnection();
  } catch (error) {
    console.error("❌ Error initializing Firebase:", error);
    // Display a visible error on the page
    showFirebaseError("Failed to initialize Firebase: " + error.message);
    
    // Make error accessible globally
    window.firebaseInitError = error;
  }
}

// Test connection to Firestore
function testDatabaseConnection() {
  if (!firebaseInitialized) {
    console.error("Cannot test database connection - Firebase not initialized");
    return;
  }
  
  console.log("Testing database connection...");
  
  // Try to read a simple document to test connection
  db.collection("_connection_test").doc("test")
    .set({ timestamp: firebase.firestore.FieldValue.serverTimestamp() })
    .then(() => {
      console.log("✅ Database connection test successful");
    })
    .catch(error => {
      console.error("❌ Database connection test failed:", error);
      // Display a visible error on the page
      showFirebaseError("Failed to connect to database: " + error.message);
    });
}

// Display a visible error message on all pages
function showFirebaseError(message) {
  // Create an error element if it doesn't exist
  let errorDiv = document.getElementById('firebase-error');
  if (!errorDiv) {
    errorDiv = document.createElement('div');
    errorDiv.id = 'firebase-error';
    errorDiv.style.position = 'fixed';
    errorDiv.style.top = '10px';
    errorDiv.style.left = '50%';
    errorDiv.style.transform = 'translateX(-50%)';
    errorDiv.style.backgroundColor = '#f44336';
    errorDiv.style.color = 'white';
    errorDiv.style.padding = '15px';
    errorDiv.style.borderRadius = '4px';
    errorDiv.style.zIndex = '9999';
    errorDiv.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
    errorDiv.style.maxWidth = '80%';
    
    document.body.appendChild(errorDiv);
  }
  
  errorDiv.innerHTML = `<strong>Firebase Error:</strong> ${message}`;
}

// Firebase utility functions for plans
const firebasePlans = {
  // Save a plan to Firestore
  savePlan: async function(plan) {
    try {
      console.log(`Attempting to save plan "${plan.name}" to Firebase...`);
      
      if (!firebaseInitialized) {
        throw new Error("Firebase not initialized");
      }
      
      await db.collection("plans").doc(plan.name).set(plan);
      console.log(`✅ Plan "${plan.name}" saved to Firebase`);
      return true;
    } catch (error) {
      console.error("❌ Error saving plan to Firebase:", error);
      showFirebaseError("Error saving plan: " + error.message);
      return false;
    }
  },
  
  // Get all plans from Firestore
  getAllPlans: async function() {
    try {
      console.log("Attempting to retrieve all plans from Firebase...");
      
      if (!firebaseInitialized) {
        throw new Error("Firebase not initialized");
      }
      
      const snapshot = await db.collection("plans").get();
      const plans = [];
      
      snapshot.forEach(doc => {
        plans.push(doc.data());
      });
      
      console.log(`✅ Retrieved ${plans.length} plans from Firebase`);
      return plans;
    } catch (error) {
      console.error("❌ Error getting plans from Firebase:", error);
      showFirebaseError("Error retrieving plans: " + error.message);
      return [];
    }
  },
  
  // Get a specific plan by name
  getPlan: async function(planName) {
    try {
      console.log(`Attempting to retrieve plan "${planName}" from Firebase...`);
      
      if (!firebaseInitialized) {
        throw new Error("Firebase not initialized");
      }
      
      const doc = await db.collection("plans").doc(planName).get();
      
      if (doc.exists) {
        console.log(`✅ Plan "${planName}" retrieved from Firebase`);
        return doc.data();
      } else {
        console.log(`Plan "${planName}" not found in Firebase`);
        return null;
      }
    } catch (error) {
      console.error("❌ Error getting plan from Firebase:", error);
      showFirebaseError("Error retrieving plan: " + error.message);
      return null;
    }
  },
  
  // Delete a plan from Firestore
  deletePlan: async function(planName) {
    try {
      console.log(`Attempting to delete plan "${planName}" from Firebase...`);
      
      if (!firebaseInitialized) {
        throw new Error("Firebase not initialized");
      }
      
      await db.collection("plans").doc(planName).delete();
      console.log(`✅ Plan "${planName}" deleted from Firebase`);
      return true;
    } catch (error) {
      console.error("❌ Error deleting plan from Firebase:", error);
      showFirebaseError("Error deleting plan: " + error.message);
      return false;
    }
  },
  
  // Set active plan
  setActivePlan: async function(plan) {
    try {
      console.log(`Attempting to set active plan to "${plan.name}" in Firebase...`);
      
      if (!firebaseInitialized) {
        throw new Error("Firebase not initialized");
      }
      
      // Store the active plan in a special document
      await db.collection("config").doc("activePlan").set({
        planName: plan.name,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✅ Active plan set to "${plan.name}" in Firebase`);
      return true;
    } catch (error) {
      console.error("❌ Error setting active plan in Firebase:", error);
      showFirebaseError("Error setting active plan: " + error.message);
      return false;
    }
  },
  
  // Get active plan
  getActivePlan: async function() {
    try {
      console.log("Attempting to get active plan from Firebase...");
      
      if (!firebaseInitialized) {
        throw new Error("Firebase not initialized");
      }
      
      const doc = await db.collection("config").doc("activePlan").get();
      
      if (doc.exists) {
        const activePlanData = doc.data();
        const planName = activePlanData.planName;
        
        if (planName) {
          const plan = await this.getPlan(planName);
          console.log(`✅ Active plan "${planName}" retrieved from Firebase`);
          return plan;
        }
      }
      
      console.log("No active plan found in Firebase");
      return null;
    } catch (error) {
      console.error("❌ Error getting active plan from Firebase:", error);
      showFirebaseError("Error retrieving active plan: " + error.message);
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