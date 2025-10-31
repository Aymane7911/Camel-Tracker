// app/api/camel-tracker/latest/route.ts
import { NextResponse } from 'next/server';
import { AzureBlobService } from '@/lib/azure';
import { csvParser } from '@/lib/csvParser';

export async function GET() {
  try {
    const azureService = new AzureBlobService('trainingdata');
    const allBlobs = await azureService.listBlobs();
    
    // Filter for race CSV files with camel ID pattern
    // Pattern: race_YYYYMMDD_HHMM_CAMELID.csv
    const raceCsvBlobs = allBlobs.filter(blob => {
      if (!blob.name.startsWith('race_') || !blob.name.endsWith('.csv')) {
        return false;
      }
      
      // Match race_YYYYMMDD_HHMM_CAMELID.csv pattern
      const match = blob.name.match(/^race_\d{8}_\d{4}_[^.]+\.csv$/);
      return match !== null;
    });
    
    if (raceCsvBlobs.length === 0) {
      console.log('📋 Available blobs:', allBlobs.map(b => b.name).slice(0, 10));
      return NextResponse.json({ 
        error: 'No camel tracker data found',
        hint: 'Looking for files matching pattern: race_YYYYMMDD_HHMM_CAMELID.csv'
      }, { status: 404 });
    }
    
    // Get the most recent race file
    const latestBlob = raceCsvBlobs[0];
    console.log(`📥 Fetching camel tracker data from: ${latestBlob.name}`);
    
    const csvContent = await azureService.downloadBlob(latestBlob.name);
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
        blobName: latestBlob.name,
        lastModified: latestBlob.lastModified?.toISOString(),
        totalRecords: transformedData.length,
        source: 'camel-tracker'
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching camel tracker data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch camel tracker data', details: String(error) },
      { status: 500 }
    );
  }
}