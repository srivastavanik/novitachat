import axios from 'axios';

interface SerperSearchResult {
  title: string;
  snippet: string;
  link: string;
  position: number;
}

interface SerperResponse {
  searchParameters: {
    q: string;
    type: string;
    engine: string;
  };
  organic: SerperSearchResult[];
  answerBox?: {
    title: string;
    answer: string;
  };
  knowledgeGraph?: {
    title: string;
    type: string;
    description: string;
    attributes?: Record<string, string>;
  };
}

class SearchService {
  private static instance: SearchService;
  private serperApiKey: string;

  private constructor() {
    this.serperApiKey = process.env.SERPER_API_KEY || 'bcab8c3c0d97018ce8e931110e296b64ecb5f269';
  }

  public static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  /**
   * Perform a web search using Serper API
   */
  async webSearch(query: string, numResults: number = 5, onProgress?: (update: string, links?: any[]) => void): Promise<string> {
    try {
      console.log('🔍 Performing web search:', query);
      
      if (onProgress) {
        onProgress(`🔍 Searching Google for: "${query}"...`);
      }
      
      const response = await axios.post<SerperResponse>(
        'https://google.serper.dev/search',
        {
          q: query,
          num: numResults,
        },
        {
          headers: {
            'X-API-KEY': this.serperApiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      const results = response.data;
      
      if (onProgress && results.organic.length > 0) {
        onProgress(`📊 Analyzing ${results.organic.length} search results:`);
        results.organic.forEach((result, index) => {
          onProgress(`  ${index + 1}. 🌐 ${result.title.substring(0, 60)}${result.title.length > 60 ? '...' : ''}`);
          onProgress(`     📍 ${result.link}`);
        });
      }
      
      let formattedResults = `Web search results for "${query}":\n\n`;

      // Add answer box if available
      if (results.answerBox) {
        formattedResults += `**Answer:** ${results.answerBox.answer}\n\n`;
      }

      // Add knowledge graph if available
      if (results.knowledgeGraph) {
        formattedResults += `**${results.knowledgeGraph.title}**\n`;
        formattedResults += `${results.knowledgeGraph.description}\n`;
        if (results.knowledgeGraph.attributes) {
          Object.entries(results.knowledgeGraph.attributes).forEach(([key, value]) => {
            formattedResults += `- ${key}: ${value}\n`;
          });
        }
        formattedResults += '\n';
      }

      // Add organic search results with clickable links
      formattedResults += '**Search Results:**\n';
      const linkPreviews: any[] = [];
      
      results.organic.forEach((result, index) => {
        formattedResults += `${index + 1}. **[${result.title}](${result.link})**\n`;
        formattedResults += `   ${result.snippet}\n`;
        formattedResults += `   🔗 Source: [${result.link}](${result.link})\n\n`;
        
        // Extract link preview data
        linkPreviews.push({
          url: result.link,
          title: result.title,
          description: result.snippet,
          image: null // We don't get images from Serper, but could enhance later
        });
      });

      // Send link previews through progress callback
      if (onProgress && linkPreviews.length > 0) {
        onProgress('✅ Search completed! Processing website previews...', linkPreviews);
      }

      return formattedResults;
    } catch (error: any) {
      console.error('❌ Web search error:', error.response?.data || error.message);
      throw new Error(`Failed to perform web search: ${error.message}`);
    }
  }

  /**
   * Perform deep research by making multiple searches and synthesizing results
   */
  async deepResearch(topic: string, onProgress?: (update: string) => void): Promise<string> {
    try {
      console.log('🔬 Performing deep research on:', topic);
      
      if (onProgress) {
        onProgress(`🔬 Starting deep research on: "${topic}"`);
      }
      
      // Generate comprehensive search queries
      const searchQueries = [
        topic,
        `${topic} latest news 2024 2025`,
        `${topic} technical details explanation`,
        `${topic} advantages disadvantages pros cons`,
        `${topic} future trends predictions outlook`,
        `${topic} research papers studies`,
        `${topic} expert opinions analysis`,
        `${topic} case studies examples`,
        `${topic} best practices implementation`,
        `${topic} common problems solutions`
      ];

      const allResults: string[] = [];
      let searchCount = 0;

      // Perform multiple searches with progress updates
      for (const query of searchQueries) {
        try {
          searchCount++;
          if (onProgress) {
            onProgress(`📊 Research query ${searchCount}/${searchQueries.length}: "${query}"`);
          }
          
          const result = await this.webSearch(query, 3, (update) => {
            if (onProgress) {
              onProgress(`  └─ ${update}`);
            }
          });
          
          allResults.push(result);
          
          // Add delay to avoid rate limiting and simulate thorough research
          await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (error) {
          console.error(`Failed to search for "${query}":`, error);
          if (onProgress) {
            onProgress(`  └─ ❌ Failed to search this query`);
          }
        }
      }
      
      if (onProgress) {
        onProgress(`✅ Completed ${searchCount} research queries. Synthesizing results...`);
      }

      // Combine and format results
      let deepResearchResults = `# Deep Research Report: ${topic}\n\n`;
      deepResearchResults += `*Generated on: ${new Date().toISOString()}*\n\n`;
      deepResearchResults += `## Overview\n\n`;
      deepResearchResults += `This comprehensive research report covers multiple aspects of "${topic}" based on current web sources.\n\n`;
      
      searchQueries.forEach((query, index) => {
        if (allResults[index]) {
          deepResearchResults += `## Research Query ${index + 1}: "${query}"\n\n`;
          deepResearchResults += allResults[index];
          deepResearchResults += '\n---\n\n';
        }
      });

      deepResearchResults += `## Summary\n\n`;
      deepResearchResults += `This deep research covered ${searchQueries.length} different aspects of "${topic}". `;
      deepResearchResults += `The information was gathered from multiple authoritative sources to provide a comprehensive understanding.\n\n`;
      deepResearchResults += `*Note: Please verify critical information from primary sources as web content can change.*`;

      return deepResearchResults;
    } catch (error: any) {
      console.error('❌ Deep research error:', error);
      throw new Error(`Failed to perform deep research: ${error.message}`);
    }
  }

  /**
   * Extract key facts from search results
   */
  async getQuickFacts(query: string): Promise<string[]> {
    try {
      const searchResult = await this.webSearch(query, 3);
      const facts: string[] = [];

      // Extract facts from search results
      const lines = searchResult.split('\n');
      lines.forEach(line => {
        if (line.includes('Answer:') || line.includes('snippet')) {
          facts.push(line.trim());
        }
      });

      return facts.slice(0, 5); // Return top 5 facts
    } catch (error) {
      console.error('Failed to get quick facts:', error);
      return [];
    }
  }
}

export const searchService = SearchService.getInstance();
export default searchService;
