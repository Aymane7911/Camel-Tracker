// app/api/camels/list/route.ts
import { NextResponse } from 'next/server';
import { AzureBlobService } from '@/lib/azure';

interface CamelInfo {
  id: string;
  races: Array<{
    blobName: string;
    date: string;
    time: string;
    lastModified?: string;
  }>;
  totalRaces: number;
}

export async function GET() {
  try {
    const azureService = new AzureBlobService('trainingdata');
    const allBlobs = await azureService.listBlobs();

    // Filter only race CSV files
    const raceCsvBlobs = allBlobs.filter(
      (blob) => blob.name.startsWith('race_') && blob.name.endsWith('.csv')
    );

    // Extract camel IDs and group races by camel
    const camelMap = new Map<string, CamelInfo>();

    raceCsvBlobs.forEach((blob) => {
      // Parse blob name: race_YYYYMMDD_HHMM_CAMELID.csv
      const match = blob.name.match(/race_(\d{8})_(\d{4})_([^.]+)\.csv/);

      if (match) {
        const [, date, time, camelId] = match;

        if (!camelMap.has(camelId)) {
          camelMap.set(camelId, {
            id: camelId,
            races: [],
            totalRaces: 0,
          });
        }

        const camelInfo = camelMap.get(camelId)!;
        camelInfo.races.push({
          blobName: blob.name,
          date,
          time,
          // convert Date | undefined to ISO string or undefined
          lastModified: blob.lastModified?.toISOString(),
        });
        camelInfo.totalRaces++;
      }
    });

    // Sort races by date/time (most recent first) for each camel
    camelMap.forEach((camel) => {
      camel.races.sort((a, b) => {
        const dateA = `${a.date}_${a.time}`;
        const dateB = `${b.date}_${b.time}`;
        return dateB.localeCompare(dateA);
      });
    });

    // Convert map to array and sort by total races
    const camels = Array.from(camelMap.values()).sort((a, b) => b.totalRaces - a.totalRaces);

    return NextResponse.json({
      camels,
      totalCamels: camels.length,
      totalRaces: raceCsvBlobs.length,
    });
  } catch (error) {
    console.error('❌ Error listing camels:', error);
    return NextResponse.json(
      { error: 'Failed to list camels', details: String(error) },
      { status: 500 }
    );
  }
}
