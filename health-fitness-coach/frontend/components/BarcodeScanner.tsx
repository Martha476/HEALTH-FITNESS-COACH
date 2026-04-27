"use client";

import React, { useRef, useState, useEffect } from "react";
import { useAuth } from "../app/context/AuthContext";

interface ScannedProduct {
  barcode: string;
  name: string;
  brand?: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  serving_size: string;
  image_url?: string;
  quantity: number;
}

interface BarcodeProduct {
  name: string;
  brand?: string;
  serving_size: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sodium_mg?: number;
  sugar_g?: number;
  image_url?: string;
  ingredients?: string;
  allergens?: string;
}

export default function BarcodeScanner() {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [scannedProduct, setScannedProduct] = useState<ScannedProduct | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [mealType, setMealType] = useState("snack");
  const [recentScans, setRecentScans] = useState<ScannedProduct[]>([]);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Initialize camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setScanning(true);
      }
    } catch (err) {
      setError("Unable to access camera. Please allow camera permissions.");
      console.error("Camera error:", err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      setScanning(false);
    }
  };

  // Fetch product by barcode
  const fetchProduct = async (barcode: string) => {
    if (!barcode.trim()) {
      setError("Please enter a valid barcode");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `${API_URL}/api/barcode-scanner/products/${barcode}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        throw new Error("Product not found for this barcode");
      }

      const data = await response.json();

      if (data.product) {
        const product: ScannedProduct = {
          barcode: data.product.barcode,
          name: data.product.name,
          brand: data.product.brand,
          calories: data.product.calories,
          protein_g: data.product.protein_g,
          carbs_g: data.product.carbs_g,
          fat_g: data.product.fat_g,
          serving_size: data.product.serving_size,
          image_url: data.product.image_url,
          quantity: quantity,
        };

        setScannedProduct(product);
        // Add to recent scans
        setRecentScans((prev) => [
          product,
          ...prev.filter((p) => p.barcode !== product.barcode),
        ].slice(0, 5));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch product");
    } finally {
      setLoading(false);
    }
  };

  // Quick log meal
  const quickLogMeal = async () => {
    if (!scannedProduct || !user) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${API_URL}/api/barcode-scanner/quick-log`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          barcode: scannedProduct.barcode,
          meal_type: mealType,
          quantity: quantity,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to log meal");
      }

      const data = await response.json();
      setError(null);
      alert(`✅ Meal logged: ${scannedProduct.name}`);
      setScannedProduct(null);
      setQuantity(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log meal");
    } finally {
      setLoading(false);
    }
  };

  const logFromRecent = async (product: ScannedProduct) => {
    setScannedProduct(product);
    setQuantity(1);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetchProduct(manualBarcode);
    setManualBarcode("");
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        📱 Barcode Scanner
      </h2>

      {/* Camera Section */}
      <div className="mb-6">
        <div className="flex gap-2 mb-4">
          {!scanning ? (
            <button
              onClick={startCamera}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition"
            >
              📷 Start Camera
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition"
            >
              🛑 Stop Camera
            </button>
          )}
        </div>

        {scanning && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full rounded-lg bg-gray-900"
            style={{ maxHeight: "400px" }}
          />
        )}
        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>

      {/* Manual Barcode Input */}
      <form onSubmit={handleManualSubmit} className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Or enter barcode manually:
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter barcode (UPC/EAN)"
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition disabled:bg-gray-400"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </form>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 rounded-lg">
          ⚠️ {error}
        </div>
      )}

      {/* Scanned Product Display */}
      {scannedProduct && (
        <div className="mb-6 p-6 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900 dark:to-blue-900 rounded-lg border-2 border-green-300 dark:border-green-700">
          <div className="grid grid-cols-2 gap-4 mb-6">
            {scannedProduct.image_url && (
              <div className="col-span-2">
                <img
                  src={scannedProduct.image_url}
                  alt={scannedProduct.name}
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
            )}

            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {scannedProduct.name}
              </h3>
              {scannedProduct.brand && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Brand: {scannedProduct.brand}
                </p>
              )}
            </div>

            {/* Nutrition Facts */}
            <div className="col-span-2 grid grid-cols-2 gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {Math.round(scannedProduct.calories * quantity)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Calories
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {(scannedProduct.protein_g * quantity).toFixed(1)}g
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Protein
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {(scannedProduct.carbs_g * quantity).toFixed(1)}g
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Carbs
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {(scannedProduct.fat_g * quantity).toFixed(1)}g
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Fat
                </div>
              </div>
            </div>
          </div>

          {/* Quantity and Meal Type Selectors */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quantity (servings):
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="bg-gray-300 dark:bg-gray-600 px-3 py-1 rounded"
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 text-center px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                />
                <button
                  onClick={() => setQuantity(Math.min(10, quantity + 1))}
                  className="bg-gray-300 dark:bg-gray-600 px-3 py-1 rounded"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Meal Type:
              </label>
              <select
                value={mealType}
                onChange={(e) => setMealType(e.target.value)}
                className="w-full px-3 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
              >
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={quickLogMeal}
              disabled={loading}
              className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition disabled:bg-gray-400 font-bold"
            >
              {loading ? "Logging..." : "✅ Log Meal"}
            </button>
            <button
              onClick={() => setScannedProduct(null)}
              className="flex-1 bg-gray-400 text-white py-3 px-4 rounded-lg hover:bg-gray-500 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Recent Scans */}
      {recentScans.length > 0 && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
            📚 Recently Scanned
          </h3>
          <div className="space-y-2">
            {recentScans.map((product) => (
              <div
                key={product.barcode}
                className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md cursor-pointer transition"
                onClick={() => logFromRecent(product)}
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {product.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {Math.round(product.calories)} cal | {product.protein_g}g protein
                  </p>
                </div>
                <button className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
                  Log
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
