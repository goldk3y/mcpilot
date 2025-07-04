import { tool } from 'ai';
import { z } from 'zod';
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

/**
 * Creates a URL to connect to the Smithery MCP server.
 */
function createSmitheryUrl(baseUrl: string, options?: { config?: any; apiKey?: string; profile?: string }): URL {
  const url = new URL(`${baseUrl}/mcp`);
  
  if (options?.config) {
    const param = Buffer.from(JSON.stringify(options.config)).toString("base64");
    url.searchParams.set("config", param);
  }
  
  if (options?.apiKey) {
    url.searchParams.set("api_key", options.apiKey);
  }
  
  if (options?.profile) {
    url.searchParams.set("profile", options.profile);
  }
  
  return url;
}

export const exaSearch = tool({
  description: 'Search the web using Exa\'s advanced neural search capabilities with full API feature support - finds high-quality, relevant content with rich metadata',
  parameters: z.object({
    query: z.string().describe('The search query'),
    numResults: z.number().default(10).describe('Number of results to return (default: 10, max: 100)'),
    type: z.enum(['neural', 'keyword', 'auto']).default('auto').describe('Search type: neural for AI-powered search, keyword for traditional search, auto for automatic selection'),
    category: z.enum(['news', 'research', 'general', 'company', 'pdf']).optional().describe('Content category filter'),
    startPublishedDate: z.string().optional().describe('Start date for content (YYYY-MM-DD format)'),
    endPublishedDate: z.string().optional().describe('End date for content (YYYY-MM-DD format)'),
    text: z.boolean().default(true).describe('Include full text content in results'),
    highlights: z.boolean().default(true).describe('Include highlighted snippets in results'),
    summary: z.boolean().default(true).describe('Include AI-generated summaries in results'),
    includeDomains: z.array(z.string()).optional().describe('Only include results from these domains'),
    excludeDomains: z.array(z.string()).optional().describe('Exclude results from these domains'),
    useAutoprompt: z.boolean().default(true).describe('Use Exa\'s autoprompt feature to enhance query'),
  }),
  execute: async ({ 
    query, 
    numResults, 
    type, 
    category, 
    startPublishedDate, 
    endPublishedDate,
    text,
    highlights,
    summary,
    includeDomains,
    excludeDomains,
    useAutoprompt
  }) => {
    try {
      const smitheryApiKey = process.env.SMITHERY_API_KEY;
      
      if (!smitheryApiKey) {
        throw new Error('SMITHERY_API_KEY environment variable is not set');
      }

      // Create connection to Exa MCP server
      const serverUrl = createSmitheryUrl(
        "https://server.smithery.ai/exa", 
        { 
          config: { debug: false }, 
          apiKey: smitheryApiKey
        }
      );

      const transport = new StreamableHTTPClientTransport(serverUrl);
      const client = new Client({
        name: "MCPilot Exa Search Client",
        version: "1.0.0"
      });

      await client.connect(transport);

      try {
        const searchArgs = {
          query,
          numResults: Math.min(numResults, 100), // Support up to 100 results like Exa API
          type,
          ...(category && { category }),
          ...(startPublishedDate && { startPublishedDate }),
          ...(endPublishedDate && { endPublishedDate }),
          text,
          highlights,
          summary,
          ...(includeDomains && { includeDomains }),
          ...(excludeDomains && { excludeDomains }),
          useAutoprompt,
        };

        const result = await client.callTool({ name: 'web_search_exa', arguments: searchArgs });
        
        // Clean up connection
        await client.close();
        
        // Extract and parse the nested JSON response
        if (result.content && Array.isArray(result.content)) {
          const textContent = result.content
            .filter((item: any) => item.type === 'text')
            .map((item: any) => item.text)
            .join('\n\n');
          
          if (textContent) {
            try {
              const searchData = JSON.parse(textContent);
              
              if (searchData.results && Array.isArray(searchData.results)) {
                // Format the results with all available Exa API data
                const formattedResults = searchData.results.map((result: any, index: number) => {
                  const parts = [`${index + 1}. **${result.title}**`];
                  
                  // Add metadata
                  const publishedDate = result.publishedDate ? new Date(result.publishedDate).toLocaleDateString() : 'Unknown';
                  parts.push(`Published: ${publishedDate}`);
                  
                  if (result.author) {
                    parts.push(`Author: ${result.author}`);
                  }
                  
                  // Add relevance score if available
                  if (result.score) {
                    parts.push(`Relevance Score: ${(result.score * 100).toFixed(1)}%`);
                  }
                  
                  // Create shortened URL for display
                  let displayUrl = result.url;
                  try {
                    const urlObj = new URL(result.url);
                    displayUrl = urlObj.hostname.replace(/^www\./, '');
                  } catch (e) {
                    // If URL parsing fails, use original
                  }
                  parts.push(`Source: [${displayUrl}](${result.url})`);
                  
                  parts.push(''); // Empty line
                  
                  // Add AI-generated summary if available (prioritize over text)
                  if (result.summary) {
                    parts.push(`**Summary:** ${result.summary}`);
                    parts.push('');
                  }
                  
                  // Add highlights if available
                  if (result.highlights && result.highlights.length > 0) {
                    parts.push(`**Key Highlights:**`);
                    result.highlights.forEach((highlight: string, i: number) => {
                      parts.push(`• ${highlight}`);
                    });
                    parts.push('');
                  }
                  
                  // Add text content if available and no summary
                  if (result.text && !result.summary) {
                    const cleanText = result.text.replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim();
                    const truncatedText = cleanText.length > 400 ? `${cleanText.substring(0, 400)}...` : cleanText;
                    parts.push(`**Content Preview:** ${truncatedText}`);
                    parts.push('');
                  }
                  
                  // Add image if available
                  if (result.image) {
                    parts.push(`**Image:** ${result.image}`);
                    parts.push('');
                  }
                  
                  parts.push('---');
                  return parts.join('\n');
                }).join('\n\n');
                
                const headerParts = [`Found ${searchData.results.length} results for "${query}"`];
                
                // Add search metadata
                if (searchData.resolvedSearchType) {
                  headerParts.push(`Search Type: ${searchData.resolvedSearchType}`);
                }
                
                if (searchData.autopromptString && searchData.autopromptString !== query) {
                  headerParts.push(`Enhanced Query: "${searchData.autopromptString}"`);
                }
                
                return [
                  headerParts.join(' | '),
                  '',
                  formattedResults,
                  '',
                  'Note: Results include relevance scores, summaries, highlights, and images when available.'
                ].join('\n');
              }
            } catch (parseError) {
              console.error('Failed to parse Exa response JSON:', parseError);
              return `Search completed but response could not be parsed: ${textContent}`;
            }
          }
        }
        
        // Fallback to stringified result if content structure is unexpected
        return `Search completed with unexpected response structure: ${JSON.stringify(result, null, 2)}`;
      } catch (toolError) {
        await client.close();
        console.error('Exa search tool call failed:', toolError);
        throw new Error(`Search failed: ${toolError instanceof Error ? toolError.message : 'Unknown error'}`);
      }

    } catch (error) {
      console.error('Exa search failed:', error);
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

export const exaGetContents = tool({
  description: 'Extract full content from specific URLs using Exa\'s advanced crawling capabilities with rich text analysis',
  parameters: z.object({
    url: z.string().describe('URL to extract content from'),
    maxCharacters: z.number().default(3000).describe('Maximum characters to extract (default: 3000)'),
    text: z.boolean().default(true).describe('Include full text content'),
    highlights: z.boolean().default(true).describe('Include highlighted key passages'),
    summary: z.boolean().default(true).describe('Include AI-generated summary of the content'),
  }),
  execute: async ({ url, maxCharacters, text, highlights, summary }) => {
    try {
      const smitheryApiKey = process.env.SMITHERY_API_KEY;
      
      if (!smitheryApiKey) {
        throw new Error('SMITHERY_API_KEY environment variable is not set');
      }

      // Create connection to Exa MCP server
      const serverUrl = createSmitheryUrl(
        "https://server.smithery.ai/exa", 
        { 
          config: { debug: false }, 
          apiKey: smitheryApiKey
        }
      );

      const transport = new StreamableHTTPClientTransport(serverUrl);
      const client = new Client({
        name: "MCPilot Exa Contents Client",
        version: "1.0.0"
      });

      await client.connect(transport);

      try {
        const result = await client.callTool({ 
          name: 'crawling_exa', 
          arguments: { url, maxCharacters, text, highlights, summary } 
        });
        
        // Clean up connection
        await client.close();
        
        // Extract and parse the response with enhanced formatting
        if (result.content && Array.isArray(result.content)) {
          const textContent = result.content
            .filter((item: any) => item.type === 'text')
            .map((item: any) => item.text)
            .join('\n\n');
          
          if (textContent) {
            try {
              const contentData = JSON.parse(textContent);
              
              const parts = [`**Content extracted from ${url}:**`];
              parts.push('');
              
              // Add title if available
              if (contentData.title) {
                parts.push(`**Title:** ${contentData.title}`);
                parts.push('');
              }
              
              // Add author if available
              if (contentData.author) {
                parts.push(`**Author:** ${contentData.author}`);
                parts.push('');
              }
              
              // Add published date if available
              if (contentData.publishedDate) {
                const publishedDate = new Date(contentData.publishedDate).toLocaleDateString();
                parts.push(`**Published:** ${publishedDate}`);
                parts.push('');
              }
              
              // Add AI-generated summary if available
              if (contentData.summary) {
                parts.push(`**AI Summary:**`);
                parts.push(contentData.summary);
                parts.push('');
              }
              
              // Add highlights if available
              if (contentData.highlights && contentData.highlights.length > 0) {
                parts.push(`**Key Highlights:**`);
                contentData.highlights.forEach((highlight: string) => {
                  parts.push(`• ${highlight}`);
                });
                parts.push('');
              }
              
              // Add full content if available
              if (contentData.content || contentData.text) {
                parts.push(`**Full Content:**`);
                parts.push(contentData.content || contentData.text);
              }
              
              return parts.join('\n');
            } catch (parseError) {
              // If JSON parsing fails, return the raw text with basic formatting
              return `**Content extracted from ${url}:**\n\n${textContent}`;
            }
          }
        }
        
        // Fallback to stringified result if content structure is unexpected
        return `Content extraction completed with unexpected response: ${JSON.stringify(result, null, 2)}`;
      } catch (toolError) {
        await client.close();
        console.error('Exa content extraction failed:', toolError);
        throw new Error(`Content extraction failed: ${toolError instanceof Error ? toolError.message : 'Unknown error'}`);
      }

    } catch (error) {
      console.error('Exa content extraction failed:', error);
      throw new Error(`Content extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Helper function to create MCP client and execute tool with full Exa API data utilization
async function executeExaTool(toolName: string, args: any): Promise<string> {
  const smitheryApiKey = process.env.SMITHERY_API_KEY;
  
  if (!smitheryApiKey) {
    throw new Error('SMITHERY_API_KEY environment variable is not set');
  }

  const serverUrl = createSmitheryUrl(
    "https://server.smithery.ai/exa", 
    { 
      config: { debug: false }, 
      apiKey: smitheryApiKey
    }
  );

  const transport = new StreamableHTTPClientTransport(serverUrl);
  const client = new Client({
    name: `MCPilot Exa ${toolName} Client`,
    version: "1.0.0"
  });

  await client.connect(transport);

  try {
    const result = await client.callTool({ name: toolName, arguments: args });
    await client.close();
    
    if (result.content && Array.isArray(result.content)) {
      const textContent = result.content
        .filter((item: any) => item.type === 'text')
        .map((item: any) => item.text)
        .join('\n\n');
      
      if (textContent) {
        try {
          const data = JSON.parse(textContent);
          
          if (data.results && Array.isArray(data.results)) {
            const formattedResults = data.results.map((result: any, index: number) => {
              const parts = [`${index + 1}. **${result.title}**`];
              
              // Add metadata
              const publishedDate = result.publishedDate ? new Date(result.publishedDate).toLocaleDateString() : 'Unknown';
              parts.push(`Published: ${publishedDate}`);
              
              if (result.author) {
                parts.push(`Author: ${result.author}`);
              }
              
              // Add relevance score if available
              if (result.score) {
                parts.push(`Relevance Score: ${(result.score * 100).toFixed(1)}%`);
              }
              
              // Create shortened URL for display
              let displayUrl = result.url;
              try {
                const urlObj = new URL(result.url);
                displayUrl = urlObj.hostname.replace(/^www\./, '');
              } catch (e) {
                // If URL parsing fails, use original
              }
              parts.push(`Source: [${displayUrl}](${result.url})`);
              
              parts.push(''); // Empty line
              
              // Add AI-generated summary if available (prioritize over text)
              if (result.summary) {
                parts.push(`**Summary:** ${result.summary}`);
                parts.push('');
              }
              
              // Add highlights if available
              if (result.highlights && result.highlights.length > 0) {
                parts.push(`**Key Highlights:**`);
                result.highlights.forEach((highlight: string) => {
                  parts.push(`• ${highlight}`);
                });
                parts.push('');
              }
              
              // Add text content if available and no summary
              if (result.text && !result.summary) {
                const cleanText = result.text.replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim();
                const truncatedText = cleanText.length > 400 ? `${cleanText.substring(0, 400)}...` : cleanText;
                parts.push(`**Content Preview:** ${truncatedText}`);
                parts.push('');
              }
              
              // Add image if available
              if (result.image) {
                parts.push(`**Image:** ${result.image}`);
                parts.push('');
              }
              
              parts.push('---');
              return parts.join('\n');
            }).join('\n\n');
            
            // Add search metadata if available
            let header = formattedResults;
            if (data.resolvedSearchType) {
              header = `Search Type: ${data.resolvedSearchType}\n\n${formattedResults}`;
            }
            
            if (data.autopromptString) {
              header = `Enhanced Query: "${data.autopromptString}"\n${header}`;
            }
            
            return header;
          } else {
            return JSON.stringify(data, null, 2);
          }
        } catch (parseError) {
          return textContent;
        }
      }
    }
    
    return JSON.stringify(result, null, 2);
  } catch (toolError) {
    await client.close();
    throw new Error(`${toolName} failed: ${toolError instanceof Error ? toolError.message : 'Unknown error'}`);
  }
}

export const exaResearchPapers = tool({
  description: 'Search for academic papers and research using Exa AI - specializes in finding scholarly articles, research papers, and academic content with advanced filtering',
  parameters: z.object({
    query: z.string().describe('Research paper search query'),
    numResults: z.number().default(10).describe('Number of research papers to return (default: 10)'),
    startPublishedDate: z.string().optional().describe('Start date for papers (YYYY-MM-DD format)'),
    endPublishedDate: z.string().optional().describe('End date for papers (YYYY-MM-DD format)'),
    summary: z.boolean().default(true).describe('Include AI-generated summaries of papers'),
    highlights: z.boolean().default(true).describe('Include highlighted key findings'),
    includeDomains: z.array(z.string()).optional().describe('Focus on specific academic domains (e.g., ["arxiv.org", "pubmed.ncbi.nlm.nih.gov"])'),
  }),
  execute: async ({ query, numResults, startPublishedDate, endPublishedDate, summary, highlights, includeDomains }) => {
    try {
      const args = { 
        query, 
        numResults, 
        summary,
        highlights,
        text: true,
        ...(startPublishedDate && { startPublishedDate }),
        ...(endPublishedDate && { endPublishedDate }),
        ...(includeDomains && { includeDomains })
      };
      const results = await executeExaTool('research_paper_search_exa', args);
      return `Found research papers for "${query}":\n\n${results}`;
    } catch (error) {
      console.error('Research paper search failed:', error);
      throw error;
    }
  },
});

export const exaCompanyResearch = tool({
  description: 'Research companies using Exa AI - finds comprehensive information about businesses, organizations, and corporations with financial and news data',
  parameters: z.object({
    companyName: z.string().describe('Name of the company to research'),
    numResults: z.number().default(10).describe('Number of search results to return (default: 10)'),
    category: z.enum(['news', 'general', 'company']).default('company').describe('Type of company information to focus on'),
    startPublishedDate: z.string().optional().describe('Start date for recent company news (YYYY-MM-DD format)'),
    endPublishedDate: z.string().optional().describe('End date for recent company news (YYYY-MM-DD format)'),
    summary: z.boolean().default(true).describe('Include AI-generated summaries of company information'),
    highlights: z.boolean().default(true).describe('Include highlighted key business insights'),
    excludeDomains: z.array(z.string()).optional().describe('Exclude specific domains (e.g., ["reddit.com", "twitter.com"] for formal sources only)'),
  }),
  execute: async ({ companyName, numResults, category, startPublishedDate, endPublishedDate, summary, highlights, excludeDomains }) => {
    try {
      const args = { 
        companyName, 
        numResults,
        category,
        summary,
        highlights,
        text: true,
        ...(startPublishedDate && { startPublishedDate }),
        ...(endPublishedDate && { endPublishedDate }),
        ...(excludeDomains && { excludeDomains })
      };
      const results = await executeExaTool('company_research_exa', args);
      return `Found company information for "${companyName}":\n\n${results}`;
    } catch (error) {
      console.error('Company research failed:', error);
      throw error;
    }
  },
});

export const exaCompetitorFinder = tool({
  description: 'Find competitors for a business using Exa AI - identifies similar companies, competitive landscape analysis, and market positioning',
  parameters: z.object({
    companyName: z.string().describe('Name of the company to find competitors for'),
    industry: z.string().optional().describe('Industry sector (optional, helps narrow search)'),
    numResults: z.number().default(8).describe('Number of competitors to find (default: 8)'),
  }),
  execute: async ({ companyName, industry, numResults }) => {
    try {
      const args = { companyName, numResults, ...(industry && { industry }) };
      const results = await executeExaTool('competitor_finder_exa', args);
      return `Found competitors for "${companyName}":\n\n${results}`;
    } catch (error) {
      console.error('Competitor search failed:', error);
      throw error;
    }
  },
});

export const exaLinkedInSearch = tool({
  description: 'Search LinkedIn profiles and companies using Exa AI - finds professional profiles, company pages, and business-related content',
  parameters: z.object({
    query: z.string().describe('LinkedIn search query (e.g., person name, company, job title)'),
    searchType: z.enum(['profiles', 'companies', 'all']).default('all').describe('Type of LinkedIn content to search'),
    numResults: z.number().default(8).describe('Number of LinkedIn results to return (default: 8)'),
  }),
  execute: async ({ query, searchType, numResults }) => {
    try {
      const results = await executeExaTool('linkedin_search_exa', { query, searchType, numResults });
      return `Found LinkedIn ${searchType} for "${query}":\n\n${results}`;
    } catch (error) {
      console.error('LinkedIn search failed:', error);
      throw error;
    }
  },
});

export const exaWikipediaSearch = tool({
  description: 'Search Wikipedia articles using Exa AI - finds comprehensive, factual information from Wikipedia entries',
  parameters: z.object({
    query: z.string().describe('Wikipedia search query (topic, person, place, concept, etc.)'),
    numResults: z.number().default(8).describe('Number of Wikipedia articles to return (default: 8)'),
  }),
  execute: async ({ query, numResults }) => {
    try {
      const results = await executeExaTool('wikipedia_search_exa', { query, numResults });
      return `Found Wikipedia articles for "${query}":\n\n${results}`;
    } catch (error) {
      console.error('Wikipedia search failed:', error);
      throw error;
    }
  },
});

export const exaGitHubSearch = tool({
  description: 'Search GitHub repositories and code using Exa AI - finds repositories, code snippets, documentation, and developer profiles',
  parameters: z.object({
    query: z.string().describe('GitHub search query (repository name, programming language, username, etc.)'),
    searchType: z.enum(['repositories', 'code', 'users', 'all']).default('all').describe('Type of GitHub content to search'),
    numResults: z.number().default(8).describe('Number of GitHub results to return (default: 8)'),
  }),
  execute: async ({ query, searchType, numResults }) => {
    try {
      const results = await executeExaTool('github_search_exa', { query, searchType, numResults });
      return `Found GitHub ${searchType} for "${query}":\n\n${results}`;
    } catch (error) {
      console.error('GitHub search failed:', error);
      throw error;
    }
  },
}); 