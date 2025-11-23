import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'
const YOLO_API_URL = import.meta.env.VITE_YOLO_API_URL ?? 'http://localhost:5000'

export interface YOLODetection {
  eyesClosed: boolean
  yawning: boolean
  droopyEyelids: boolean
  droopyFace: boolean
  confidence: number
  detectedClasses: string[]
  perclos: number
  fom: number
  blinkRate: number
  yawnCount: number
}

/**
 * Process a video frame through YOLO model
 * @param imageBlob - The image blob from canvas
 * @param cameraId - Camera identifier
 * @returns YOLO detection results
 */
export async function processFrameWithYOLO(
  imageBlob: Blob,
  cameraId: number,
): Promise<YOLODetection | null> {
  try {
    // TODO: Replace with actual YOLO API endpoint
    // Example implementation:
    // const formData = new FormData()
    // formData.append('image', imageBlob, 'frame.jpg')
    // formData.append('camera_id', cameraId.toString())
    // 
    // const response = await axios.post<YOLODetection>(`${YOLO_API_URL}/yolo/detect`, formData, {
    //   headers: { 'Content-Type': 'multipart/form-data' },
    //   timeout: 5000,
    // })
    // return response.data

    // For now, simulate YOLO detection
    // This should be replaced with actual API call to Python backend
    await new Promise((resolve) => setTimeout(resolve, 50)) // Simulate API delay

    const random = Math.random()
    return {
      eyesClosed: random < 0.15,
      yawning: random < 0.1,
      droopyEyelids: random < 0.2,
      droopyFace: random < 0.12,
      confidence: 0.4 + Math.random() * 0.5,
      detectedClasses: random < 0.3 ? ['Eyes_closed'] : random < 0.4 ? ['Yawning'] : [],
      perclos: Math.random() * 0.5,
      fom: Math.random() * 0.5,
      blinkRate: 15 + Math.random() * 5,
      yawnCount: Math.floor(Math.random() * 3),
    }
  } catch (error) {
    console.error('YOLO processing error:', error)
    return null
  }
}

