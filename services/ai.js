// services/ai.js - Mock AI service for FixIt-AI
export async function diagnose(symptom) {
  console.log("🔧 FixIt-AI diagnosing:", symptom);
  
  // Common appliance issues database
  const knowledgeBase = {
    'fridge': {
      diagnosis: 'Refrigerator cooling system malfunction',
      steps: [
        'Check if refrigerator is plugged in and power outlet is working',
        'Clean condenser coils at the back of the fridge',
        'Ensure thermostat is set to correct temperature (37-40°F)',
        'Check for blocked air vents inside',
        'Listen for compressor sounds - if silent, may need professional repair'
      ],
      difficulty: 'medium'
    },
    'washing machine': {
      diagnosis: 'Washing machine drainage or motor issue',
      steps: [
        'Check drain hose for kinks or blockages',
        'Clean the filter/lint trap',
        'Ensure machine is level and not vibrating excessively',
        'Check water supply valves are fully open',
        'Inspect for error codes on display'
      ],
      difficulty: 'easy'
    },
    'microwave': {
      diagnosis: 'Microwave heating or power supply problem',
      steps: [
        'Check power cord and outlet',
        'Ensure door closes completely and safety latch works',
        'Test with a cup of water for 1 minute',
        'Listen for unusual noises when operating',
        'Check interior for sparking or arcing'
      ],
      difficulty: 'medium'
    },
    'oven': {
      diagnosis: 'Oven heating element or temperature control issue',
      steps: [
        'Check if oven light turns on when door opens',
        'Test both bake and broil functions',
        'Use oven thermometer to verify temperature accuracy',
        'Inspect heating elements for visible damage',
        'Check circuit breaker for tripped switches'
      ],
      difficulty: 'technician required'
    },
    'air conditioner': {
      diagnosis: 'AC cooling or airflow problem',
      steps: [
        'Check thermostat settings and batteries',
        'Clean or replace air filters',
        'Ensure outdoor unit is clear of debris',
        'Listen for unusual compressor noises',
        'Check for ice buildup on coils'
      ],
      difficulty: 'medium'
    }
  };

  const symptomLower = symptom.toLowerCase();
  
  // Find matching appliance
  for (const [appliance, solution] of Object.entries(knowledgeBase)) {
    if (symptomLower.includes(appliance)) {
      return {
        appliance,
        ...solution,
        confidence: 'high'
      };
    }
  }

  // Generic response for unknown appliances
  return {
    diagnosis: 'General household appliance issue detected',
    steps: [
      'Ensure appliance is properly plugged in and powered',
      'Check circuit breaker or fuse box',
      'Consult user manual for specific error codes',
      'Unplug for 5 minutes then restart',
      'Contact professional technician for complex issues'
    ],
    difficulty: 'unknown',
    confidence: 'low'
  };
}