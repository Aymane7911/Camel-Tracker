// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { AzureBlobService } from '@/lib/azure';

export async function GET() {
  try {
    const azureService = new AzureBlobService('trainingdata');
    const isConnected = await azureService.testConnection();
    
    if (!isConnected) {
      return NextResponse.json(
        { status: 'error', message: 'Azure Storage connection failed' },
        { status: 503 }
      );
    }
    
    const containerExists = await azureService.containerExists();
    
    return NextResponse.json({
      status: 'healthy',
      azureStorage: {
        connected: isConnected,
        containerExists,
        containerId: azureService.getContainerId()
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Health check failed',
        error: String(error)
      },
      { status: 500 }
    );
  }
}