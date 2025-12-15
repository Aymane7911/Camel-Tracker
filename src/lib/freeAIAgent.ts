// lib/freeAIAgent.ts
// Free Rule-Based AI Agent - No API costs!

interface QueryIntent {
  type: 'compare' | 'topPerformers' | 'statistics' | 'conditions' | 'consistency' | 'trend' | 'general' | 'unknown';
  camelIds: string[];
  metric?: 'speed' | 'acceleration' | 'distance' | 'races' | 'consistency';
  limit?: number;
  filters?: {
    minSpeed?: number;
    maxSpeed?: number;
    dateRange?: { start: string; end: string };
  };
}

interface CamelData {
  camelId: string;
  races: any[];
  totalRaces: number;
}

interface AnalysisResult {
  response: string;
  data?: any;
  suggestions?: string[];
}

class FreeAIAgent {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  }

  /**
   * Main query processing function
   */
  async processQuery(query: string): Promise<AnalysisResult> {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Parse user intent
    const intent = this.parseIntent(normalizedQuery);
    
    console.log('🤖 Detected intent:', intent);

    try {
      switch (intent.type) {
        case 'compare':
          return await this.handleCompare(intent);
        
        case 'topPerformers':
          return await this.handleTopPerformers(intent);
        
        case 'statistics':
          return await this.handleStatistics(intent);
        
        case 'conditions':
          return await this.handleConditions(intent);
        
        case 'consistency':
          return await this.handleConsistency(intent);
        
        case 'trend':
          return await this.handleTrend(intent);
        
        case 'general':
          return this.handleGeneral(normalizedQuery);
        
        default:
          return this.handleUnknown(normalizedQuery);
      }
    } catch (error) {
      console.error('❌ Error processing query:', error);
      return {
        response: `I encountered an error while analyzing your request: ${error instanceof Error ? error.message : 'Unknown error'}. Please try rephrasing your question or check if the data is available.`,
        suggestions: [
          'Try asking about specific camel IDs',
          'Check if the camels exist in the system',
          'Ask for a list of all available camels'
        ]
      };
    }
  }

  /**
   * Parse user query to understand intent
   */
  private parseIntent(query: string): QueryIntent {
    const intent: QueryIntent = {
      type: 'unknown',
      camelIds: [],
    };

    // Extract camel IDs (8-12 character alphanumeric strings)
    const camelIdPattern = /\b[a-f0-9]{8,12}\b/gi;
    const matches = query.match(camelIdPattern);
    if (matches) {
      intent.camelIds = matches;
    }

    // Detect query type
    if (this.hasKeywords(query, ['compare', 'versus', 'vs', 'difference between'])) {
      intent.type = 'compare';
    } else if (this.hasKeywords(query, ['top', 'best', 'fastest', 'highest', 'rank', 'leader'])) {
      intent.type = 'topPerformers';
      intent.limit = this.extractNumber(query) || 5;
      
      // Detect metric
      if (this.hasKeywords(query, ['speed'])) intent.metric = 'speed';
      else if (this.hasKeywords(query, ['acceleration'])) intent.metric = 'acceleration';
      else if (this.hasKeywords(query, ['distance'])) intent.metric = 'distance';
      else if (this.hasKeywords(query, ['race', 'experience'])) intent.metric = 'races';
      else intent.metric = 'speed'; // default
    } else if (this.hasKeywords(query, ['statistics', 'stats', 'analysis', 'detailed', 'performance', 'metrics'])) {
      intent.type = 'statistics';
    } else if (this.hasKeywords(query, ['condition', 'filter', 'where', 'above', 'below', 'exceed'])) {
      intent.type = 'conditions';
      intent.filters = this.extractFilters(query);
    } else if (this.hasKeywords(query, ['consistent', 'consistency', 'reliable', 'stable', 'predictable'])) {
      intent.type = 'consistency';
    } else if (this.hasKeywords(query, ['trend', 'improving', 'progress', 'over time', 'getting better', 'worse'])) {
      intent.type = 'trend';
    } else if (this.hasKeywords(query, ['list', 'show all', 'available', 'camels', 'what camels'])) {
      intent.type = 'general';
    }

    return intent;
  }

  private hasKeywords(query: string, keywords: string[]): boolean {
    return keywords.some(keyword => query.includes(keyword));
  }

  private extractNumber(query: string): number | null {
    const match = query.match(/\b(\d+)\b/);
    return match ? parseInt(match[1]) : null;
  }

  private extractFilters(query: string): any {
    const filters: any = {};
    
    // Extract speed filters
    const speedMatch = query.match(/(?:speed|above|over|exceed(?:ing)?|greater than)\s+(\d+(?:\.\d+)?)/i);
    if (speedMatch) {
      filters.minSpeed = parseFloat(speedMatch[1]);
    }

    return filters;
  }

  /**
   * Fetch data from API
   */
  private async fetchCamelData(camelId: string): Promise<CamelData> {
    const response = await fetch(`${this.baseUrl}/api/camels/${camelId}`);
    if (!response.ok) throw new Error(`Failed to fetch data for camel ${camelId}`);
    return await response.json();
  }

  private async fetchAllCamels(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/camels/list`);
    if (!response.ok) throw new Error('Failed to fetch camels list');
    return await response.json();
  }

  /**
   * Calculate metrics from race data
   */
  private calculateMetrics(races: any[]) {
    const allDataPoints = races.flatMap(race => race.data || []);
    
    if (allDataPoints.length === 0) {
      return {
        maxSpeed: 0,
        avgSpeed: 0,
        maxAcceleration: 0,
        avgAcceleration: 0,
        totalDistance: 0,
        avgGForce: 0,
        totalRaces: races.length,
        totalDataPoints: 0
      };
    }

    const speeds = allDataPoints.map((d: any) => d.Speed || 0);
    const accelerations = allDataPoints.map((d: any) => d.Accel || 0);
    
    return {
      maxSpeed: Math.max(...speeds),
      avgSpeed: speeds.reduce((a, b) => a + b, 0) / speeds.length,
      maxAcceleration: Math.max(...accelerations),
      avgAcceleration: accelerations.reduce((a, b) => a + b, 0) / accelerations.length,
      totalDistance: Math.max(...allDataPoints.map((d: any) => d.Dist || 0)),
      avgGForce: allDataPoints.reduce((sum: number, d: any) => {
        const gForce = Math.sqrt(
          Math.pow(d.AccX || 0, 2) + 
          Math.pow(d.AccY || 0, 2) + 
          Math.pow(d.AccZ || 0, 2)
        );
        return sum + gForce;
      }, 0) / allDataPoints.length,
      totalRaces: races.length,
      totalDataPoints: allDataPoints.length
    };
  }

  /**
   * Handler: Compare camels
   */
  private async handleCompare(intent: QueryIntent): Promise<AnalysisResult> {
    if (intent.camelIds.length < 2) {
      // If no camel IDs found, fetch all and compare top 2
      const allCamelsData = await this.fetchAllCamels();
      if (allCamelsData.camels.length < 2) {
        return {
          response: "I need at least 2 camels to compare. Please provide camel IDs or ensure there are multiple camels in the system.",
          suggestions: ['Try: "Compare camel [ID1] and [ID2]"', 'Ask: "Show me all available camels"']
        };
      }
      intent.camelIds = allCamelsData.camels.slice(0, 2).map((c: any) => c.id);
    }

    const camelDataPromises = intent.camelIds.map(id => this.fetchCamelData(id));
    const camelsData = await Promise.all(camelDataPromises);

    const comparisons = camelsData.map(data => ({
      camelId: data.camelId,
      metrics: this.calculateMetrics(data.races)
    }));

    let response = `📊 **Comparison of ${intent.camelIds.length} Camels**\n\n`;

    comparisons.forEach((comp, idx) => {
      const shortId = comp.camelId.substring(0, 8);
      response += `**Camel ${idx + 1}: ${shortId}**\n`;
      response += `• Max Speed: ${comp.metrics.maxSpeed.toFixed(2)} km/h\n`;
      response += `• Avg Speed: ${comp.metrics.avgSpeed.toFixed(2)} km/h\n`;
      response += `• Total Races: ${comp.metrics.totalRaces}\n`;
      response += `• Avg G-Force: ${comp.metrics.avgGForce.toFixed(2)}g\n`;
      response += `• Total Distance: ${comp.metrics.totalDistance.toFixed(2)}m\n\n`;
    });

    // Add analysis
    const fastest = comparisons.reduce((prev, curr) => 
      curr.metrics.maxSpeed > prev.metrics.maxSpeed ? curr : prev
    );
    const mostExperienced = comparisons.reduce((prev, curr) => 
      curr.metrics.totalRaces > prev.metrics.totalRaces ? curr : prev
    );

    response += `\n🏆 **Analysis:**\n`;
    response += `• Fastest: ${fastest.camelId.substring(0, 8)} (${fastest.metrics.maxSpeed.toFixed(2)} km/h)\n`;
    response += `• Most Experienced: ${mostExperienced.camelId.substring(0, 8)} (${mostExperienced.metrics.totalRaces} races)\n`;

    return {
      response,
      data: comparisons,
      suggestions: [
        'Ask for detailed statistics on the fastest camel',
        'Check consistency analysis',
        'View trend analysis for any camel'
      ]
    };
  }

  /**
   * Handler: Top performers
   */
  private async handleTopPerformers(intent: QueryIntent): Promise<AnalysisResult> {
    const allCamelsData = await this.fetchAllCamels();
    const limit = intent.limit || 5;

    // Fetch detailed data for all camels
    const detailedDataPromises = allCamelsData.camels.map((camel: any) => 
      this.fetchCamelData(camel.id)
    );
    const detailedData = await Promise.all(detailedDataPromises);

    const camelMetrics = detailedData.map(data => ({
      camelId: data.camelId,
      metrics: this.calculateMetrics(data.races)
    }));

    // Sort based on metric
    let sorted = [...camelMetrics];
    let metricName = '';
    
    switch (intent.metric) {
      case 'speed':
        sorted.sort((a, b) => b.metrics.maxSpeed - a.metrics.maxSpeed);
        metricName = 'Max Speed';
        break;
      case 'acceleration':
        sorted.sort((a, b) => b.metrics.maxAcceleration - a.metrics.maxAcceleration);
        metricName = 'Max Acceleration';
        break;
      case 'distance':
        sorted.sort((a, b) => b.metrics.totalDistance - a.metrics.totalDistance);
        metricName = 'Total Distance';
        break;
      case 'races':
        sorted.sort((a, b) => b.metrics.totalRaces - a.metrics.totalRaces);
        metricName = 'Total Races';
        break;
      default:
        sorted.sort((a, b) => b.metrics.avgSpeed - a.metrics.avgSpeed);
        metricName = 'Average Speed';
    }

    const topPerformers = sorted.slice(0, limit);

    let response = `🏆 **Top ${limit} Performers by ${metricName}**\n\n`;

    topPerformers.forEach((performer, idx) => {
      const medals = ['🥇', '🥈', '🥉'];
      const medal = medals[idx] || `${idx + 1}.`;
      const shortId = performer.camelId.substring(0, 8);
      
      response += `${medal} **${shortId}**\n`;
      
      switch (intent.metric) {
        case 'speed':
          response += `   ${performer.metrics.maxSpeed.toFixed(2)} km/h\n`;
          break;
        case 'acceleration':
          response += `   ${performer.metrics.maxAcceleration.toFixed(2)} m/s²\n`;
          break;
        case 'distance':
          response += `   ${performer.metrics.totalDistance.toFixed(2)}m\n`;
          break;
        case 'races':
          response += `   ${performer.metrics.totalRaces} races\n`;
          break;
        default:
          response += `   ${performer.metrics.avgSpeed.toFixed(2)} km/h avg\n`;
      }
      
      response += `   Races: ${performer.metrics.totalRaces} | Avg Speed: ${performer.metrics.avgSpeed.toFixed(2)} km/h\n\n`;
    });

    return {
      response,
      data: topPerformers,
      suggestions: [
        `Get detailed analysis of ${topPerformers[0].camelId.substring(0, 8)}`,
        'Compare top 3 performers',
        'Show consistency rankings'
      ]
    };
  }

  /**
   * Handler: Statistics
   */
  private async handleStatistics(intent: QueryIntent): Promise<AnalysisResult> {
    let camelId = intent.camelIds[0];
    
    if (!camelId) {
      // Get the top performer if no ID specified
      const allCamelsData = await this.fetchAllCamels();
      if (allCamelsData.camels.length === 0) {
        return {
          response: "No camels available for analysis.",
          suggestions: ['Check if data is loaded', 'Refresh the dashboard']
        };
      }
      camelId = allCamelsData.camels[0].id;
    }

    const camelData = await this.fetchCamelData(camelId);
    const metrics = this.calculateMetrics(camelData.races);
    
    const allDataPoints = camelData.races.flatMap((race: any) => race.data || []);
    const speeds = allDataPoints.map((d: any) => d.Speed || 0).filter(s => s > 0);
    
    // Calculate standard deviation
    const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    const variance = speeds.reduce((sum, speed) => sum + Math.pow(speed - avgSpeed, 2), 0) / speeds.length;
    const stdDev = Math.sqrt(variance);
    
    // Calculate median
    const sortedSpeeds = [...speeds].sort((a, b) => a - b);
    const median = sortedSpeeds[Math.floor(sortedSpeeds.length / 2)];

    const shortId = camelId.substring(0, 8);
    
    let response = `📊 **Detailed Performance Statistics for ${shortId}**\n\n`;
    response += `**Overall Statistics:**\n`;
    response += `• Total Races: ${metrics.totalRaces}\n`;
    response += `• Total Data Points: ${metrics.totalDataPoints}\n\n`;
    
    response += `**🏃 Speed Metrics:**\n`;
    response += `• Maximum Speed: ${metrics.maxSpeed.toFixed(2)} km/h\n`;
    response += `• Average Speed: ${metrics.avgSpeed.toFixed(2)} km/h\n`;
    response += `• Median Speed: ${median.toFixed(2)} km/h\n`;
    response += `• Standard Deviation: ${stdDev.toFixed(2)} km/h\n`;
    response += `• Speed Consistency: ${stdDev < 5 ? 'Excellent' : stdDev < 10 ? 'Good' : 'Moderate'}\n\n`;
    
    response += `**⚡ Acceleration:**\n`;
    response += `• Max Acceleration: ${metrics.maxAcceleration.toFixed(2)} m/s²\n`;
    response += `• Avg Acceleration: ${metrics.avgAcceleration.toFixed(2)} m/s²\n\n`;
    
    response += `**📏 Distance & Force:**\n`;
    response += `• Total Distance: ${metrics.totalDistance.toFixed(2)}m\n`;
    response += `• Average G-Force: ${metrics.avgGForce.toFixed(2)}g\n\n`;
    
    response += `**🔍 Performance Rating:**\n`;
    if (metrics.maxSpeed > 40) response += `• Speed: ⭐⭐⭐⭐⭐ Elite\n`;
    else if (metrics.maxSpeed > 35) response += `• Speed: ⭐⭐⭐⭐ Excellent\n`;
    else if (metrics.maxSpeed > 30) response += `• Speed: ⭐⭐⭐ Good\n`;
    else response += `• Speed: ⭐⭐ Developing\n`;
    
    if (stdDev < 5) response += `• Consistency: ⭐⭐⭐⭐⭐ Very Consistent\n`;
    else if (stdDev < 10) response += `• Consistency: ⭐⭐⭐⭐ Consistent\n`;
    else response += `• Consistency: ⭐⭐⭐ Moderate\n`;

    return {
      response,
      data: { camelId, metrics, stdDev, median },
      suggestions: [
        'Compare this camel with others',
        'Check performance trends over time',
        'View top performers ranking'
      ]
    };
  }

  /**
   * Handler: Conditions
   */
  private async handleConditions(intent: QueryIntent): Promise<AnalysisResult> {
    const allCamelsData = await this.fetchAllCamels();
    const detailedDataPromises = allCamelsData.camels.map((camel: any) => 
      this.fetchCamelData(camel.id)
    );
    const detailedData = await Promise.all(detailedDataPromises);

    let filteredRaces: any[] = [];

    detailedData.forEach(camelData => {
      camelData.races.forEach((race: any) => {
        const avgSpeed = race.data.reduce((sum: number, d: any) => sum + (d.Speed || 0), 0) / race.data.length;
        const maxSpeed = Math.max(...race.data.map((d: any) => d.Speed || 0));
        
        let matches = true;
        
        if (intent.filters?.minSpeed && avgSpeed < intent.filters.minSpeed) {
          matches = false;
        }
        
        if (matches) {
          filteredRaces.push({
            camelId: camelData.camelId,
            date: race.date,
            time: race.time,
            avgSpeed: avgSpeed.toFixed(2),
            maxSpeed: maxSpeed.toFixed(2),
            records: race.totalRecords
          });
        }
      });
    });

    if (filteredRaces.length === 0) {
      return {
        response: `No races found matching your criteria. Try adjusting your filters.`,
        suggestions: [
          'Try a lower speed threshold',
          'Check available data range',
          'View all races without filters'
        ]
      };
    }

    // Sort by avgSpeed descending
    filteredRaces.sort((a, b) => parseFloat(b.avgSpeed) - parseFloat(a.avgSpeed));

    let response = `🔍 **Found ${filteredRaces.length} Races Matching Your Criteria**\n\n`;
    
    if (intent.filters?.minSpeed) {
      response += `Filter: Average speed ≥ ${intent.filters.minSpeed} km/h\n\n`;
    }

    filteredRaces.slice(0, 10).forEach((race, idx) => {
      const shortId = race.camelId.substring(0, 8);
      response += `**${idx + 1}. Camel ${shortId}**\n`;
      response += `   Date: ${this.formatDate(race.date)} at ${this.formatTime(race.time)}\n`;
      response += `   Avg Speed: ${race.avgSpeed} km/h | Max: ${race.maxSpeed} km/h\n`;
      response += `   Data Points: ${race.records}\n\n`;
    });

    if (filteredRaces.length > 10) {
      response += `\n_Showing top 10 of ${filteredRaces.length} matching races_\n`;
    }

    return {
      response,
      data: filteredRaces,
      suggestions: [
        'Analyze the top performing camel',
        'Compare camels from these races',
        'Adjust speed threshold'
      ]
    };
  }

  /**
   * Handler: Consistency
   */
  private async handleConsistency(intent: QueryIntent): Promise<AnalysisResult> {
    const allCamelsData = await this.fetchAllCamels();
    const detailedDataPromises = allCamelsData.camels.map((camel: any) => 
      this.fetchCamelData(camel.id)
    );
    const detailedData = await Promise.all(detailedDataPromises);

    const consistencyScores = detailedData.map(camelData => {
      const raceAvgSpeeds = camelData.races.map((race: any) => 
        race.data.reduce((sum: number, d: any) => sum + (d.Speed || 0), 0) / race.data.length
      );

      if (raceAvgSpeeds.length < 2) {
        return {
          camelId: camelData.camelId,
          variance: 999,
          avgSpeed: raceAvgSpeeds[0] || 0,
          totalRaces: camelData.races.length,
          score: 0
        };
      }

      const avg = raceAvgSpeeds.reduce((a, b) => a + b, 0) / raceAvgSpeeds.length;
      const variance = Math.sqrt(
        raceAvgSpeeds.reduce((sum, speed) => sum + Math.pow(speed - avg, 2), 0) / raceAvgSpeeds.length
      );

      // Lower variance = more consistent
      const score = Math.max(0, 100 - (variance * 10));

      return {
        camelId: camelData.camelId,
        variance: variance,
        avgSpeed: avg,
        totalRaces: camelData.races.length,
        score: score
      };
    }).filter(c => c.totalRaces >= 2);

    consistencyScores.sort((a, b) => a.variance - b.variance);

    let response = `🎯 **Consistency Rankings** (Lower variance = more consistent)\n\n`;

    consistencyScores.slice(0, 5).forEach((camel, idx) => {
      const shortId = camel.camelId.substring(0, 8);
      const rating = camel.variance < 2 ? '⭐⭐⭐⭐⭐' : 
                     camel.variance < 4 ? '⭐⭐⭐⭐' : 
                     camel.variance < 6 ? '⭐⭐⭐' : '⭐⭐';
      
      response += `**${idx + 1}. ${shortId}** ${rating}\n`;
      response += `   Variance: ${camel.variance.toFixed(2)} km/h\n`;
      response += `   Consistency Score: ${camel.score.toFixed(0)}/100\n`;
      response += `   Avg Speed: ${camel.avgSpeed.toFixed(2)} km/h\n`;
      response += `   Total Races: ${camel.totalRaces}\n\n`;
    });

    const mostConsistent = consistencyScores[0];
    response += `\n🏆 **Most Consistent: ${mostConsistent.camelId.substring(0, 8)}**\n`;
    response += `This camel shows the most predictable performance with a variance of just ${mostConsistent.variance.toFixed(2)} km/h across ${mostConsistent.totalRaces} races.\n`;

    return {
      response,
      data: consistencyScores,
      suggestions: [
        `Get detailed stats for ${mostConsistent.camelId.substring(0, 8)}`,
        'Compare top 3 consistent performers',
        'Check speed rankings'
      ]
    };
  }

  /**
   * Handler: Trend analysis
   */
  private async handleTrend(intent: QueryIntent): Promise<AnalysisResult> {
    let camelId = intent.camelIds[0];
    
    if (!camelId) {
      return {
        response: "Please specify a camel ID to analyze trends. Example: 'Show trend for camel 6bd6973f'",
        suggestions: ['List all camels', 'Show top performers']
      };
    }

    const camelData = await this.fetchCamelData(camelId);
    
    if (camelData.races.length < 2) {
      return {
        response: `Camel ${camelId.substring(0, 8)} doesn't have enough races (need at least 2) for trend analysis.`,
        suggestions: ['Try another camel', 'View statistics instead']
      };
    }

    // Sort races chronologically
    const sortedRaces = [...camelData.races].sort((a, b) => {
      const dateA = `${a.date}_${a.time}`;
      const dateB = `${b.date}_${b.time}`;
      return dateA.localeCompare(dateB);
    });

    const racePerformances = sortedRaces.map((race: any, idx: number) => {
      const avgSpeed = race.data.reduce((sum: number, d: any) => sum + (d.Speed || 0), 0) / race.data.length;
      const maxSpeed = Math.max(...race.data.map((d: any) => d.Speed || 0));
      
      return {
        raceNum: idx + 1,
        date: race.date,
        time: race.time,
        avgSpeed,
        maxSpeed,
        change: idx > 0 ? ((avgSpeed - racePerformances[idx - 1].avgSpeed) / racePerformances[idx - 1].avgSpeed * 100) : 0
      };
    });

    const shortId = camelId.substring(0, 8);
    let response = `📈 **Performance Trend Analysis for ${shortId}**\n\n`;
    response += `**Race-by-Race Performance:**\n\n`;

    racePerformances.forEach(race => {
      const arrow = race.change > 0 ? '📈' : race.change < 0 ? '📉' : '➡️';
      const changeStr = race.change !== 0 ? ` ${arrow} ${race.change > 0 ? '+' : ''}${race.change.toFixed(1)}%` : '';
      
      response += `Race ${race.raceNum}: ${race.avgSpeed.toFixed(2)} km/h${changeStr}\n`;
    });

    const firstRace = racePerformances[0];
    const lastRace = racePerformances[racePerformances.length - 1];
    const overallChange = ((lastRace.avgSpeed - firstRace.avgSpeed) / firstRace.avgSpeed * 100);

    response += `\n**📊 Overall Trend:**\n`;
    response += `• First Race: ${firstRace.avgSpeed.toFixed(2)} km/h\n`;
    response += `• Latest Race: ${lastRace.avgSpeed.toFixed(2)} km/h\n`;
    response += `• Overall Change: ${overallChange > 0 ? '+' : ''}${overallChange.toFixed(1)}%\n`;
    response += `• Trend: ${overallChange > 5 ? '📈 Improving' : overallChange < -5 ? '📉 Declining' : '➡️ Stable'}\n`;

    const bestRace = racePerformances.reduce((prev, curr) => curr.avgSpeed > prev.avgSpeed ? curr : prev);
    response += `\n**🏆 Best Performance:**\n`;
    response += `Race ${bestRace.raceNum} - ${bestRace.avgSpeed.toFixed(2)} km/h\n`;

    return {
      response,
      data: racePerformances,
      suggestions: [
        'Get detailed statistics',
        'Compare with other camels',
        'Check consistency rating'
      ]
    };
  }

  /**
   * Handler: General queries
   */
  private async handleGeneral(query: string): Promise<AnalysisResult> {
    const allCamelsData = await this.fetchAllCamels();
    
    let response = `📋 **Available Camels** (${allCamelsData.totalCamels} total)\n\n`;
    
    allCamelsData.camels.forEach((camel: any, idx: number) => {
      const shortId = camel.id.substring(0, 8);
      response += `${idx + 1}. **${shortId}**\n`;
      response += `   Total Races: ${camel.totalRaces}\n\n`;
    });

    response += `\n**What would you like to know?**\n`;
    response += `• Compare camels\n`;
    response += `• Find top performers\n`;
    response += `• View detailed statistics\n`;
    response += `• Check consistency rankings\n`;
    response += `• Analyze performance trends\n`;

    return {
      response,
      data: allCamelsData,
      suggestions: [
        'Compare top 2 camels',
        'Show me the fastest camel',
        'Which camel is most consistent?'
      ]
    };
  }

  /**
   * Handler: Unknown queries
   */
  private handleUnknown(query: string): AnalysisResult {
    return {
      response: `I'm not sure how to help with that query. I can help you with:\n\n` +
        `📊 **Compare Camels**: "Compare camel A and B"\n` +
        `🏆 **Top Performers**: "Show top 5 fastest camels"\n` +
        `📈 **Statistics**: "Show statistics for camel X"\n` +
        `🔍 **Filter Races**: "Show races above 30 km/h"\n` +
        `🎯 **Consistency**: "Which camel is most consistent?"\n` +
        `📉 **Trends**: "Show trend for camel X"\n` +
        `📋 **List All**: "Show all available camels"\n\n` +
        `Try rephrasing your question using these examples!`,
      suggestions: [
        'Show all available camels',
        'Compare top 2 camels',
        'Find the fastest camel'
      ]
    };
  }

  /**
   * Utility: Format date
   */
  private formatDate(dateStr: string): string {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
  }

  /**
   * Utility: Format time
   */
  private formatTime(timeStr: string): string {
    if (!timeStr || timeStr.length !== 4) return timeStr;
    return `${timeStr.substring(0, 2)}:${timeStr.substring(2, 4)}`;
  }
}

// Export singleton instance
export const freeAIAgent = new FreeAIAgent();

// Main function to use in API
export async function processFreeAIQuery(query: string): Promise<AnalysisResult> {
  return freeAIAgent.processQuery(query);
}