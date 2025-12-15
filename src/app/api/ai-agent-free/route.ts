// app/api/ai-agent-free/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { processFreeAIQuery } from '@/lib/freeAIAgent';

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    console.log(`🤖 Free AI Agent received query: ${query}`);

    const result = await processFreeAIQuery(query);

    return NextResponse.json({
      success: true,
      query,
      response: result.response,
      data: result.data,
      suggestions: result.suggestions,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Free AI Agent API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process AI query',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing and documentation
export async function GET() {
  return NextResponse.json({
    message: 'Free AI Agent API is running - No API costs!',
    version: '1.0.0',
    features: [
      'Compare camel performance',
      'Find top performers',
      'Detailed statistics',
      'Performance trends',
      'Consistency analysis',
      'Race filtering',
    ],
    examples: [
      {
        query: 'Compare camel 6bd6973f and 1d491c2f',
        description: 'Compare two camels side by side'
      },
      {
        query: 'Show me the top 3 fastest camels',
        description: 'Get rankings by speed'
      },
      {
        query: 'Give me statistics for camel 6bd6973f',
        description: 'Detailed performance analysis'
      },
      {
        query: 'Which camel is most consistent?',
        description: 'Find the most reliable performer'
      },
      {
        query: 'Show races above 30 km/h',
        description: 'Filter races by conditions'
      },
      {
        query: 'Show trend for camel 6bd6973f',
        description: 'Analyze performance over time'
      }
    ],
    usage: 'POST /api/ai-agent-free with { "query": "your question here" }',
    cost: 'FREE - No API costs!',
  });
}