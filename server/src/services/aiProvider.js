// Mock AI Provider
// This simulates a real AI API like OpenAI
// Clean interface — if you swap to real AI later,
// only this file needs to change

// Simulate random delay between 3-6 seconds
const randomDelay = () => {
  const ms = Math.floor(Math.random() * 3000) + 3000
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Mock AI responses — returns creative output based on prompt
const generateMockOutput = (prompt) => {
  const responses = [
    `🎨 CAMPAIGN CONCEPT: "${prompt.substring(0, 30)}..."
    
Visual Direction: Neon-drenched ultraviolet streets where luxury meets chaos. 
Tagline: "Wear the void. Own the night."
Target: Gen-Z rebels who smell like the future.
Medium: AR filters + limited holographic bottle drops.
Vibe: Cyberpunk royalty meets underground rave culture.`,

    `💎 CREATIVE BRIEF: Based on "${prompt.substring(0, 25)}..."

Campaign Name: NEURAL BLOOM
Concept: Scent as data. Every spray uploads a memory.
Visual: Glitching luxury — cracked marble, neon veins, chrome tears.
Copy: "Your signature. Corrupted beautifully."
Activation: Hidden QR codes in every bottle linking to exclusive drops.`,

    `🌆 PITCH DECK SUMMARY: "${prompt.substring(0, 25)}..."

THE BIG IDEA: Perfume as protest. Luxury as rebellion.
Scent Profile: Rain on hot circuits, burnt velvet, digital smoke.
Campaign: 72-hour mystery drop. No ads. Only whispers.
Influencer Strategy: Zero macro-influencers. 1000 micro-rebels.
Result: Sold out in 4 hours. Waitlist: 200K.`,

    `⚡ CONCEPT DECK: "${prompt.substring(0, 25)}..."

Brand Story: Born in a server room. Aged in crystal.
Visual World: Tokyo back-alleys meet Paris couture.
Gen-Z Hook: "This perfume has a wallet address."
Limited edition NFT-linked bottle. 
Scent: Nostalgia for a future that hasn't happened yet.`,
  ]

  // Pick a random response
  return responses[Math.floor(Math.random() * responses.length)]
}

// Main generate function — this is what jobWorker calls
// Returns: { success: true, output } or { success: false, error }
const generate = async (prompt) => {
  try {
    // Simulate network delay (real AI APIs take time)
    await randomDelay()

    // Simulate 15% failure rate (real AI APIs sometimes fail)
    if (Math.random() < 0.15) {
      throw new Error('AI provider temporarily unavailable')
    }

    const output = generateMockOutput(prompt)
    return { success: true, output }

  } catch (error) {
    return { success: false, error: error.message }
  }
}

module.exports = { generate }

/*
Why a separate aiProvider file?
Clean abstraction. Right now generate() returns mock data. Later you replace 10 lines with a real OpenAI call. 
Nothing else in the codebase changes.
*/