import { Router } from 'express'
import { Request, Response } from 'express'
import { authenticate } from '../middleware/auth'
import axios from 'axios'

const router = Router()

// In-memory storage for user API keys (in production, use database)
const userApiKeys = new Map<string, string>()

// Validate API key with Novita
router.post('/validate-api-key', authenticate, async (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body

    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' })
    }

    // Check if it's a valid format
    if (!apiKey.startsWith('nvapi-') && !apiKey.startsWith('sk-')) {
      return res.status(400).json({ 
        valid: false, 
        message: 'Invalid API key format' 
      })
    }

    // Test the API key with a simple request to Novita
    try {
      const response = await axios.get('https://api.novita.ai/v3/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.status === 200) {
        return res.json({ 
          valid: true, 
          message: 'API key is valid' 
        })
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        return res.json({ 
          valid: false, 
          message: 'Invalid or expired API key' 
        })
      } else if (error.response?.status === 403) {
        return res.json({ 
          valid: false, 
          message: 'API key has insufficient permissions' 
        })
      }
      throw error
    }
  } catch (error) {
    console.error('Error validating API key:', error)
    res.status(500).json({ error: 'Failed to validate API key' })
  }
})

// Save API key for user
router.post('/save-api-key', authenticate, async (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body
    const userId = (req as any).user.id

    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' })
    }

    // Store the API key for the user
    userApiKeys.set(userId, apiKey)

    res.json({ 
      success: true, 
      message: 'API key saved successfully' 
    })
  } catch (error) {
    console.error('Error saving API key:', error)
    res.status(500).json({ error: 'Failed to save API key' })
  }
})

// Get user's API key
export const getUserApiKey = (userId: string): string | undefined => {
  return userApiKeys.get(userId)
}

// Remove user's API key
router.delete('/api-key', authenticate, (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id
    userApiKeys.delete(userId)
    
    res.json({ 
      success: true, 
      message: 'API key removed successfully' 
    })
  } catch (error) {
    console.error('Error removing API key:', error)
    res.status(500).json({ error: 'Failed to remove API key' })
  }
})

export default router