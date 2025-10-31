// app/api/camel-tracker/data/route.ts
import { NextResponse } from 'next/server';
import { AzureBlobService } from '@/lib/azure';
import { csvParser } from '@/lib/csvParser';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const blobName = searchParams.get('blob');
    
    if (!blobName) {
      return NextResponse.json({ error: 'Blob name is required' }, { status: 400 });
    }
    
    const azureService = new AzureBlobService('trainingdata');
    console.log(`📥 Fetching specific camel tracker data: ${blobName}`);
    
    const csvContent = await azureService.downloadBlob(blobName);
    const parsedData = await csvParser.parseFromString(csvContent, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      delimiter: '',
      delimitersToGuess: [',', ';', '\t', '|']
    });
    
    const transformedData = csvParser.transformForDashboard(parsedData, {
      numericFields: ['Time', 'Lat', 'Lon', 'Speed', 'Accel', 'Dist', 'AccX', 'AccY', 'AccZ']
    });
    
    return NextResponse.json({
      data: transformedData,
      metadata: {
        blobName,
        totalRecords: transformedData.length,
        source: 'camel-tracker'
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching specific camel tracker data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch camel tracker data', details: String(error) },
      { status: 500 }
    );
  }
}