// app/api/history/all/route.ts
import { NextResponse } from 'next/server';
import { AzureBlobService } from '@/lib/azure';
import { csvParser } from '@/lib/csvParser';

interface HistoricalData {
  blobName: string;
  lastModified: string;
  recordCount: number;
  averageSpeed?: number;
  maxSpeed?: number;
  totalDistance?: number;
}

export async function GET() {
  try {
    const azureService = new AzureBlobService('trainingdata');
    const allBlobs = await azureService.listBlobs();
    
    // Get all camel tracker blobs
    const camelBlobs = allBlobs.filter(blob => 
      blob.name.startsWith('race_') && 
      blob.name.endsWith('.csv') &&
      !blob.name.includes('tracker_')
    );
    
    // Get all jockey robot blobs
    const jockeyBlobs = allBlobs.filter(blob => 
      blob.name.startsWith('tracker_') && 
      blob.name.endsWith('.csv')
    );
    
    // Process camel tracker history with statistics
    const camelHistory: HistoricalData[] = await Promise.all(
      camelBlobs.map(async (blob) => {
        try {
          const csvContent = await azureService.downloadBlob(blob.name);
          const parsedData = await csvParser.parseFromString(csvContent, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true
          });
          
          const data = parsedData.data;
          const speeds = data.map((d: any) => d.Speed || 0).filter((s: number) => s > 0);
          const distances = data.map((d: any) => d.Dist || 0);
          
          return {
            blobName: blob.name,
            lastModified: blob.lastModified?.toISOString() || '',
            recordCount: data.length,
            averageSpeed: speeds.length > 0 
              ? speeds.reduce((a: number, b: number) => a + b, 0) / speeds.length 
              : 0,
            maxSpeed: speeds.length > 0 ? Math.max(...speeds) : 0,
            totalDistance: distances.length > 0 ? Math.max(...distances) : 0
          };
        } catch (error) {
          console.error(`Error processing ${blob.name}:`, error);
          return {
            blobName: blob.name,
            lastModified: blob.lastModified?.toISOString() || '',
            recordCount: 0
          };
        }
      })
    );
    
    // Process jockey robot history with statistics
    const jockeyHistory: HistoricalData[] = await Promise.all(
      jockeyBlobs.map(async (blob) => {
        try {
          const csvContent = await azureService.downloadBlob(blob.name);
          const parsedData = await csvParser.parseFromString(csvContent, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true
          });
          
          const data = parsedData.data;
          const speeds = data.map((d: any) => d['Speed(km/'] || 0).filter((s: number) => s > 0);
          const distances = data.map((d: any) => d['Distance(m)'] || 0);
          
          return {
            blobName: blob.name,
            lastModified: blob.lastModified?.toISOString() || '',
            recordCount: data.length,
            averageSpeed: speeds.length > 0 
              ? speeds.reduce((a: number, b: number) => a + b, 0) / speeds.length 
              : 0,
            maxSpeed: speeds.length > 0 ? Math.max(...speeds) : 0,
            totalDistance: distances.length > 0 ? Math.max(...distances) : 0
          };
        } catch (error) {
          console.error(`Error processing ${blob.name}:`, error);
          return {
            blobName: blob.name,
            lastModified: blob.lastModified?.toISOString() || '',
            recordCount: 0
          };
        }
      })
    );
    
    return NextResponse.json({
      camelHistory: camelHistory.sort((a, b) => 
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
      ),
      jockeyHistory: jockeyHistory.sort((a, b) => 
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
      ),
      summary: {
        totalCamelSessions: camelHistory.length,
        totalJockeySessions: jockeyHistory.length,
        totalRecords: 
          camelHistory.reduce((sum, h) => sum + h.recordCount, 0) +
          jockeyHistory.reduce((sum, h) => sum + h.recordCount, 0)
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history', details: String(error) },
      { status: 500 }
    );
  }
}
