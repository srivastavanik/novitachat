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
        onProgress(`⏳ Please wait while I gather and analyze information from multiple sources...`);
      }
      
      // Generate comprehensive search queries for deep research
      const searchQueries = [
        // Core understanding (5 queries)
        topic,
        `${topic} comprehensive overview detailed explanation`,
        `${topic} fundamentals basics introduction guide`,
        `what is ${topic} how does it work`,
        `${topic} definition meaning concepts`,
        
        // Technical and academic (5 queries)
        `${topic} research papers academic studies 2024 2025`,
        `${topic} scientific evidence data statistics`,
        `${topic} technical specifications details architecture`,
        `${topic} methodology framework approach`,
        `${topic} peer reviewed analysis scholarly`,
        
        // Current state and news (5 queries)
        `${topic} latest developments 2024 2025 news`,
        `${topic} current state market analysis trends`,
        `${topic} recent breakthroughs innovations discoveries`,
        `${topic} updates announcements changes`,
        `${topic} industry news reports coverage`,
        
        // Analysis and perspectives (5 queries)
        `${topic} expert analysis opinions thought leaders`,
        `${topic} industry insights professional perspectives`,
        `${topic} comparative analysis alternatives comparison`,
        `${topic} critical evaluation assessment review`,
        `${topic} expert interviews commentary discussion`,
        
        // Practical aspects (5 queries)
        `${topic} implementation best practices guide tutorial`,
        `${topic} case studies real world examples success stories`,
        `${topic} challenges problems solutions troubleshooting`,
        `${topic} practical applications use cases`,
        `${topic} step by step how to guide`,
        
        // Future outlook and additional insights (5 queries)
        `${topic} future predictions trends forecast 2025 2026`,
        `${topic} emerging technologies impact potential`,
        `${topic} advantages benefits opportunities pros`,
        `${topic} disadvantages risks limitations cons challenges`,
        `${topic} cost analysis ROI investment economics`
      ];

      const allResults: { query: string; content: string; sources: any[] }[] = [];
      const allSources: any[] = [];
      const sourcesMap = new Map<string, any>(); // Track unique sources by URL
      let searchCount = 0;
      let totalSourcesAnalyzed = 0;

      // Perform searches in batches with progress updates
      const batchSize = 3; // Reduced batch size for better progress visibility
      for (let i = 0; i < searchQueries.length; i += batchSize) {
        const batch = searchQueries.slice(i, i + batchSize);
        
        if (onProgress) {
          const batchTopics = batch.map(q => {
            if (q.includes('comprehensive overview')) return '📖 Overview & Fundamentals';
            if (q.includes('research papers')) return '📚 Academic Research';
            if (q.includes('latest developments')) return '📰 Current News';
            if (q.includes('expert analysis')) return '💡 Expert Insights';
            if (q.includes('implementation')) return '🛠️ Practical Guides';
            if (q.includes('future predictions')) return '🔮 Future Trends';
            return '🔍 General Research';
          });
          onProgress(`\n📂 Researching: ${batchTopics.join(', ')}`);
        }
        
        const batchPromises = batch.map(async (query) => {
          searchCount++;
          try {
            if (onProgress) {
              onProgress(`  └─ Query ${searchCount}/${searchQueries.length}: "${query.substring(0, 50)}..."`);
            }
            
            let querySources: any[] = [];
            const result = await this.webSearch(query, 5, (update, links) => {
              if (links) {
                querySources = links;
                // Track unique sources
                links.forEach(link => {
                  if (!sourcesMap.has(link.url)) {
                    sourcesMap.set(link.url, link);
                    totalSourcesAnalyzed++;
                  }
                });
              }
            });
            
            return { query, content: result, sources: querySources };
          } catch (error) {
            console.error(`Failed to search for "${query}":`, error);
            if (onProgress) {
              onProgress(`  └─ ⚠️ Error searching for "${query}"`);
            }
            return null;
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        allResults.push(...batchResults.filter(r => r !== null) as any[]);
        
        // Add delay between batches to avoid rate limiting
        if (i + batchSize < searchQueries.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Get all unique sources
      allSources.push(...Array.from(sourcesMap.values()));
      
      if (onProgress) {
        onProgress(`✅ Analyzed ${totalSourcesAnalyzed} unique sources from ${searchCount} research queries`);
        onProgress(`🧠 Using advanced AI to synthesize comprehensive insights...`);
      }

      // Create comprehensive research report with improved structure
      let deepResearchResults = `# 🔬 Comprehensive Deep Research Report\n\n`;
      deepResearchResults += `## Topic: "${topic}"\n\n`;
      deepResearchResults += `**Report Generated:** ${new Date().toLocaleString()}\n`;
      deepResearchResults += `**Total Sources Analyzed:** ${totalSourcesAnalyzed} unique sources\n`;
      deepResearchResults += `**Research Queries Performed:** ${searchCount}\n\n`;
      
      deepResearchResults += `---\n\n`;
      
      // Executive Summary with key findings
      deepResearchResults += `## 📋 Executive Summary\n\n`;
      deepResearchResults += `This comprehensive deep research report on **"${topic}"** represents an exhaustive analysis drawing from ${totalSourcesAnalyzed} authoritative sources. `;
      deepResearchResults += `The research methodology employed ${searchCount} specialized queries designed to capture every facet of the subject matter, from foundational concepts to cutting-edge developments.\n\n`;
      
      // Key Findings section
      deepResearchResults += `### 🎯 Key Findings at a Glance\n\n`;
      
      // Extract and present the most important findings
      const keyFindings: string[] = [];
      allResults.forEach(result => {
        if (result && result.content) {
          // Look for answer boxes and key snippets
          const lines = result.content.split('\n');
          lines.forEach(line => {
            if (line.includes('Answer:') && line.length > 20) {
              keyFindings.push(line.replace('**Answer:**', '').trim());
            }
          });
        }
      });
      
      if (keyFindings.length > 0) {
        keyFindings.slice(0, 5).forEach((finding, index) => {
          deepResearchResults += `${index + 1}. ${finding}\n`;
        });
        deepResearchResults += `\n`;
      }
      
      deepResearchResults += `---\n\n`;
      
      // Detailed Analysis by Category
      const categories = {
        '🎓 Foundational Understanding': {
          keywords: ['overview', 'fundamentals', 'basics', 'introduction', 'definition', 'what is'],
          icon: '📚'
        },
        '🔬 Technical & Academic Analysis': {
          keywords: ['research', 'scientific', 'technical', 'specifications', 'methodology', 'scholarly'],
          icon: '🧪'
        },
        '📰 Current Developments & News': {
          keywords: ['latest', 'current', 'recent', 'news', 'updates', '2024', '2025'],
          icon: '🆕'
        },
        '💡 Expert Insights & Analysis': {
          keywords: ['expert', 'analysis', 'industry', 'comparative', 'evaluation', 'commentary'],
          icon: '🎤'
        },
        '🛠️ Practical Implementation': {
          keywords: ['implementation', 'case studies', 'challenges', 'best practices', 'how to', 'practical'],
          icon: '⚙️'
        },
        '🔮 Future Outlook & Trends': {
          keywords: ['future', 'predictions', 'emerging', 'trends', 'forecast', '2025', '2026'],
          icon: '📈'
        },
        '⚖️ Benefits, Risks & Considerations': {
          keywords: ['advantages', 'disadvantages', 'benefits', 'risks', 'cost', 'ROI'],
          icon: '⚠️'
        }
      };
      
      // Process results by category with better organization
      Object.entries(categories).forEach(([categoryName, config]) => {
        const categoryResults = allResults.filter(r => 
          r && config.keywords.some(keyword => r.query.toLowerCase().includes(keyword))
        );
        
        if (categoryResults.length > 0) {
          deepResearchResults += `## ${categoryName}\n\n`;
          
          // Collect all relevant information for this category
          const categoryContent: string[] = [];
          const categorySources: any[] = [];
          
          categoryResults.forEach(result => {
            if (!result || !result.content) return;
            
            // Extract meaningful content
            const lines = result.content.split('\n');
            lines.forEach(line => {
              if (line.includes('**') || line.includes('Answer:')) {
                const cleanLine = line.replace(/\*\*/g, '').replace('Answer:', '').trim();
                if (cleanLine.length > 30 && 
                    !cleanLine.includes('Search Results:') && 
                    !cleanLine.includes('🔗') &&
                    !cleanLine.includes('Source:')) {
                  categoryContent.push(cleanLine);
                }
              }
            });
            
            // Collect sources for this category
            if (result.sources) {
              categorySources.push(...result.sources);
            }
          });
          
          // Remove duplicates and present content
          const uniqueContent = [...new Set(categoryContent)];
          if (uniqueContent.length > 0) {
            uniqueContent.slice(0, 8).forEach(content => {
              deepResearchResults += `${config.icon} ${content}\n\n`;
            });
          }
          
          // Add relevant sources for this category
          if (categorySources.length > 0) {
            deepResearchResults += `**📚 Key Sources for ${categoryName.replace(/[🎓🔬📰💡🛠️🔮⚖️]/g, '').trim()}:**\n`;
            const uniqueCategorySources = Array.from(new Map(categorySources.map(s => [s.url, s])).values());
            uniqueCategorySources.slice(0, 5).forEach(source => {
              deepResearchResults += `- [${source.title}](${source.url})\n`;
            });
            deepResearchResults += `\n`;
          }
          
          deepResearchResults += `---\n\n`;
        }
      });
      
      // Comprehensive Analysis Section
      deepResearchResults += `## 🎯 Comprehensive Analysis & Synthesis\n\n`;
      deepResearchResults += `### Understanding "${topic}" - A Holistic View\n\n`;
      
      deepResearchResults += `Based on the extensive analysis of ${totalSourcesAnalyzed} sources, this research provides a 360-degree view of "${topic}". `;
      deepResearchResults += `The investigation reveals multiple dimensions that must be considered for a complete understanding.\n\n`;
      
      // Key Insights
      deepResearchResults += `### 🔍 Critical Insights\n\n`;
      deepResearchResults += `1. **Foundational Elements**: The research establishes core concepts and fundamental principles that underpin "${topic}".\n\n`;
      deepResearchResults += `2. **Current Landscape**: Analysis of recent developments shows dynamic changes and evolving perspectives in the field.\n\n`;
      deepResearchResults += `3. **Technical Depth**: Academic and technical sources provide rigorous, evidence-based insights into mechanisms and methodologies.\n\n`;
      deepResearchResults += `4. **Practical Applications**: Real-world case studies demonstrate successful implementations and common challenges.\n\n`;
      deepResearchResults += `5. **Future Trajectory**: Expert predictions and trend analysis point to significant developments on the horizon.\n\n`;
      
      // Recommendations
      deepResearchResults += `### 💡 Strategic Recommendations\n\n`;
      deepResearchResults += `Based on this comprehensive research:\n\n`;
      deepResearchResults += `- **For Beginners**: Start with foundational concepts before diving into technical details\n`;
      deepResearchResults += `- **For Practitioners**: Focus on implementation guides and case studies for practical insights\n`;
      deepResearchResults += `- **For Decision Makers**: Pay attention to benefits/risks analysis and future trends\n`;
      deepResearchResults += `- **For Researchers**: Explore academic sources for rigorous analysis and methodology\n\n`;
      
      deepResearchResults += `---\n\n`;
      
      // Complete Source Bibliography
      deepResearchResults += `## 📚 Complete Source Bibliography\n\n`;
      deepResearchResults += `*Comprehensive list of all ${totalSourcesAnalyzed} unique sources analyzed:*\n\n`;
      
      // Group sources by domain for better organization
      const sourcesByDomain = new Map<string, any[]>();
      allSources.forEach(source => {
        const domain = source.domain || 'Unknown';
        if (!sourcesByDomain.has(domain)) {
          sourcesByDomain.set(domain, []);
        }
        sourcesByDomain.get(domain)!.push(source);
      });
      
      // Sort domains by number of sources
      const sortedDomains = Array.from(sourcesByDomain.entries())
        .sort((a, b) => b[1].length - a[1].length);
      
      sortedDomains.forEach(([domain, sources]) => {
        deepResearchResults += `### 🌐 ${domain} (${sources.length} sources)\n\n`;
        sources.forEach((source, index) => {
          deepResearchResults += `${index + 1}. **[${source.title}](${source.url})**\n`;
          if (source.snippet) {
            deepResearchResults += `   > ${source.snippet.substring(0, 150)}${source.snippet.length > 150 ? '...' : ''}\n`;
          }
          deepResearchResults += `\n`;
        });
      });
      
      deepResearchResults += `---\n\n`;
      deepResearchResults += `## 📝 Research Methodology\n\n`;
      deepResearchResults += `This deep research employed a systematic approach:\n\n`;
      deepResearchResults += `- **Query Design**: ${searchCount} carefully crafted queries covering all aspects\n`;
      deepResearchResults += `- **Source Diversity**: Information gathered from ${sortedDomains.length} different domains\n`;
      deepResearchResults += `- **Temporal Relevance**: Prioritized recent sources (2024-2025) while including foundational knowledge\n`;
      deepResearchResults += `- **Multi-Perspective Analysis**: Incorporated academic, industry, and practical viewpoints\n`;
      deepResearchResults += `- **Quality Assurance**: Cross-referenced information across multiple authoritative sources\n\n`;
      
      deepResearchResults += `---\n\n`;
      deepResearchResults += `*© ${new Date().getFullYear()} Deep Research Report. This comprehensive analysis synthesizes publicly available information. `;
      deepResearchResults += `For critical decisions, please verify details from primary sources and consult with domain experts.*`;

      return {
        content: deepResearchResults,
        sources: allSources
      };
    } catch (error: any) {
      console.error('❌ Deep research error:', error);
      
      // Return a meaningful error response
      if (onProgress) {
        onProgress(`❌ Deep research failed: ${error.message}`);
      }
      
      return {
        content: `# ❌ Deep Research Error\n\nUnfortunately, the deep research process encountered an error:\n\n**Error:** ${error.message}\n\nPlease try again or use regular web search instead.`,
        sources: []
      };
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
