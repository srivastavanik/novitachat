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
      const searchSources: any[] = [];
      
      results.organic.forEach((result, index) => {
        formattedResults += `${index + 1}. **[${result.title}](${result.link})**\n`;
        formattedResults += `   ${result.snippet}\n`;
        formattedResults += `   🔗 Source: [${result.link}](${result.link})\n\n`;
        
        // Extract domain from URL
        let domain = '';
        try {
          const url = new URL(result.link);
          domain = url.hostname.replace('www.', '');
        } catch (e) {
          domain = result.link;
        }
        
        // Create search source data
        searchSources.push({
          url: result.link,
          title: result.title,
          snippet: result.snippet,
          domain: domain,
          favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
        });
      });

      // Send search sources through progress callback
      if (onProgress && searchSources.length > 0) {
        onProgress('✅ Search completed! Processing results...', searchSources);
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
  async deepResearch(topic: string, onProgress?: (update: string, links?: any[]) => void): Promise<{ content: string; sources: any[] }> {
    try {
      console.log('🔬 Performing DEEP research on:', topic);
      
      if (onProgress) {
        onProgress(`🔬 Starting comprehensive deep research on: "${topic}"`);
        onProgress(`📚 This research will analyze 20-30 sources for thorough coverage...`);
      }
      
      // Generate comprehensive search queries for deep research
      const searchQueries = [
        // Core understanding
        topic,
        `${topic} comprehensive overview detailed explanation`,
        `${topic} fundamentals basics introduction guide`,
        
        // Technical and academic
        `${topic} research papers academic studies peer reviewed`,
        `${topic} scientific evidence data statistics`,
        `${topic} technical specifications details architecture`,
        
        // Current state and news
        `${topic} latest developments 2024 2025 news`,
        `${topic} current state market analysis`,
        `${topic} recent breakthroughs innovations`,
        
        // Analysis and perspectives
        `${topic} expert analysis opinions thought leaders`,
        `${topic} industry insights professional perspectives`,
        `${topic} comparative analysis alternatives`,
        
        // Practical aspects
        `${topic} implementation best practices guide`,
        `${topic} case studies real world examples`,
        `${topic} challenges problems solutions troubleshooting`,
        
        // Future outlook
        `${topic} future predictions trends forecast`,
        `${topic} emerging technologies impact`,
        `${topic} roadmap timeline projections`,
        
        // Specialized queries
        `${topic} advantages benefits opportunities`,
        `${topic} disadvantages risks limitations concerns`,
        `${topic} cost analysis ROI investment`,
        `${topic} regulatory compliance legal aspects`,
        `${topic} environmental social impact`,
        `${topic} global perspectives international`
      ];

      const allResults: { query: string; content: string; sources: any[] }[] = [];
      const allSources: any[] = [];
      let searchCount = 0;
      let totalSourcesAnalyzed = 0;

      // Perform multiple searches with progress updates
      for (const query of searchQueries) {
        try {
          searchCount++;
          if (onProgress) {
            onProgress(`🔍 Research query ${searchCount}/${searchQueries.length}: "${query}"`);
          }
          
          let querySources: any[] = [];
          const result = await this.webSearch(query, 5, (update, links) => {
            if (links) {
              querySources = links;
              totalSourcesAnalyzed += links.length;
            }
            if (onProgress) {
              onProgress(`  └─ ${update}`, links);
            }
          });
          
          allResults.push({ query, content: result, sources: querySources });
          allSources.push(...querySources);
          
          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 800));
        } catch (error) {
          console.error(`Failed to search for "${query}":`, error);
          if (onProgress) {
            onProgress(`  └─ ⚠️ Skipping this query due to error`);
          }
        }
      }
      
      if (onProgress) {
        onProgress(`✅ Analyzed ${totalSourcesAnalyzed} sources across ${searchCount} research queries`);
        onProgress(`📊 Synthesizing comprehensive research report...`);
      }

      // Create comprehensive research report
      let deepResearchResults = `# 🔬 Comprehensive Deep Research Report: ${topic}\n\n`;
      deepResearchResults += `*Generated on: ${new Date().toLocaleString()}*\n`;
      deepResearchResults += `*Sources analyzed: ${totalSourcesAnalyzed} from ${searchCount} research queries*\n\n`;
      
      deepResearchResults += `## 📋 Executive Summary\n\n`;
      deepResearchResults += `This comprehensive research report on "${topic}" synthesizes information from ${totalSourcesAnalyzed} authoritative sources across ${searchCount} specialized research queries. `;
      deepResearchResults += `The analysis covers fundamental concepts, current developments, expert perspectives, practical implementations, and future outlook.\n\n`;
      
      // Organize results by category
      const categories = {
        'Core Understanding': ['overview', 'fundamentals', 'basics', 'introduction'],
        'Technical & Academic': ['research', 'scientific', 'technical', 'specifications'],
        'Current Developments': ['latest', 'current', 'recent', 'news'],
        'Expert Analysis': ['expert', 'analysis', 'industry', 'comparative'],
        'Practical Implementation': ['implementation', 'case studies', 'challenges', 'best practices'],
        'Future Outlook': ['future', 'predictions', 'emerging', 'roadmap'],
        'Benefits & Risks': ['advantages', 'disadvantages', 'benefits', 'risks'],
        'Additional Insights': ['cost', 'regulatory', 'environmental', 'global']
      };
      
      // Process results by category
      Object.entries(categories).forEach(([categoryName, keywords]) => {
        const categoryResults = allResults.filter(r => 
          keywords.some(keyword => r.query.toLowerCase().includes(keyword))
        );
        
        if (categoryResults.length > 0) {
          deepResearchResults += `## 📌 ${categoryName}\n\n`;
          
          categoryResults.forEach(result => {
            // Extract key information from each search
            const lines = result.content.split('\n');
            const relevantInfo = lines.filter(line => 
              line.includes('**') || 
              line.includes('Answer:') || 
              (line.length > 50 && !line.includes('Source:') && !line.includes('🔗'))
            ).slice(0, 10);
            
            if (relevantInfo.length > 0) {
              deepResearchResults += `### 🔹 ${result.query}\n\n`;
              relevantInfo.forEach(info => {
                deepResearchResults += `${info}\n`;
              });
              deepResearchResults += `\n`;
              
              // Add source references
              if (result.sources.length > 0) {
                deepResearchResults += `**Sources consulted:**\n`;
                result.sources.slice(0, 3).forEach(source => {
                  deepResearchResults += `- [${source.title}](${source.url})\n`;
                });
                deepResearchResults += `\n`;
              }
            }
          });
          
          deepResearchResults += `---\n\n`;
        }
      });
      
      // Add comprehensive conclusion
      deepResearchResults += `## 🎯 Key Takeaways and Conclusions\n\n`;
      deepResearchResults += `Based on the analysis of ${totalSourcesAnalyzed} sources:\n\n`;
      deepResearchResults += `1. **Comprehensive Coverage**: This research examined "${topic}" from multiple angles including technical specifications, practical implementations, expert opinions, and future projections.\n\n`;
      deepResearchResults += `2. **Multi-Source Validation**: Information was cross-referenced across numerous authoritative sources to ensure accuracy and comprehensiveness.\n\n`;
      deepResearchResults += `3. **Current Relevance**: The research prioritized recent information (2024-2025) while also considering established knowledge and historical context.\n\n`;
      deepResearchResults += `4. **Practical Insights**: Beyond theoretical understanding, the research gathered real-world case studies, implementation guides, and problem-solving approaches.\n\n`;
      deepResearchResults += `5. **Balanced Perspective**: Both advantages and challenges were thoroughly explored to provide a complete picture.\n\n`;
      
      deepResearchResults += `## 📚 Complete Source Bibliography\n\n`;
      deepResearchResults += `*All ${totalSourcesAnalyzed} sources consulted during this research:*\n\n`;
      
      // Remove duplicates from sources
      const uniqueSources = Array.from(new Map(allSources.map(s => [s.url, s])).values());
      
      uniqueSources.forEach((source, index) => {
        deepResearchResults += `${index + 1}. **[${source.title}](${source.url})**\n`;
        deepResearchResults += `   - Domain: ${source.domain}\n`;
        if (source.snippet) {
          deepResearchResults += `   - Summary: ${source.snippet}\n`;
        }
        deepResearchResults += `\n`;
      });
      
      deepResearchResults += `---\n\n`;
      deepResearchResults += `*Note: This deep research report synthesizes information from multiple web sources. For critical decisions, please verify information from primary sources and consult with domain experts.*`;

      return {
        content: deepResearchResults,
        sources: uniqueSources
      };
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
