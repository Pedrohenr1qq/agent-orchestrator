<?php

namespace App\Ai\Tools;

use App\Models\SystemSetting;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Support\Facades\Http;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class WebSearchTool implements Tool
{
    public function description(): Stringable|string
    {
        return 'Search the internet for up-to-date information, news, research papers, documentation, or facts.';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'query' => $schema->string()
                ->description('The search query or keywords to find on the web')
                ->required(),
            'max_results' => $schema->integer()
                ->description('Maximum number of search results to return (default 5)')
                ->default(5),
        ];
    }

    public function handle(Request $request): Stringable|string
    {
        $query = $request['query'];
        $maxResults = (int) ($request['max_results'] ?? 5);

        // 1. If Tavily API Key is configured, use it for optimal LLM-ready results
        $tavilyKey = SystemSetting::get('tavily_api_key') ?: config('services.tavily.key');
        if (! empty($tavilyKey)) {
            try {
                $response = Http::timeout(10)->post('https://api.tavily.com/search', [
                    'api_key' => $tavilyKey,
                    'query' => $query,
                    'max_results' => $maxResults,
                    'search_depth' => 'basic',
                ]);

                if ($response->successful()) {
                    $results = $response->json('results', []);
                    if (! empty($results)) {
                        $out = "Web Search Results for '{$query}' (via Tavily):\n\n";
                        foreach (array_slice($results, 0, $maxResults) as $i => $item) {
                            $title = $item['title'] ?? 'No title';
                            $url = $item['url'] ?? '';
                            $snippet = $item['content'] ?? '';
                            $out .= ($i + 1).". **{$title}**\n   URL: {$url}\n   {$snippet}\n\n";
                        }

                        return trim($out);
                    }
                }
            } catch (\Throwable $e) {
                // Fallback to DuckDuckGo
            }
        }

        // 2. Default: Free DuckDuckGo Search (no API key required)
        try {
            $response = Http::withUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
                ->timeout(12)
                ->asForm()
                ->post('https://html.duckduckgo.com/html/', [
                    'q' => $query,
                ]);

            if ($response->successful()) {
                $html = $response->body();
                $results = [];

                // Extract search results from HTML
                preg_match_all('/<a class="result__url" href="([^"]+)".*?<h2 class="result__title">.*?<a.*?>(.*?)<\/a>.*?<a class="result__snippet".*?>(.*?)<\/a>/s', $html, $matches, PREG_SET_ORDER);

                if (empty($matches)) {
                    // Alternative regex for DuckDuckGo HTML structure
                    preg_match_all('/<a class="result__snippet[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/s', $html, $matches, PREG_SET_ORDER);
                }

                foreach (array_slice($matches, 0, $maxResults) as $i => $m) {
                    $url = urldecode($m[1] ?? '');
                    // Clean DuckDuckGo redirect url if applicable
                    if (str_contains($url, 'uddg=')) {
                        parse_str(parse_url($url, PHP_URL_QUERY) ?? '', $queryParams);
                        $url = $queryParams['uddg'] ?? $url;
                    }

                    $snippet = strip_tags($m[3] ?? $m[2] ?? '');
                    $title = strip_tags($m[2] ?? 'Result '.($i + 1));

                    $results[] = [
                        'title' => trim($title),
                        'url' => trim($url),
                        'snippet' => trim($snippet),
                    ];
                }

                if (! empty($results)) {
                    $out = "Web Search Results for '{$query}':\n\n";
                    foreach ($results as $i => $r) {
                        $out .= ($i + 1).". **{$r['title']}**\n   URL: {$r['url']}\n   {$r['snippet']}\n\n";
                    }

                    return trim($out);
                }
            }

            return "No web results found for '{$query}'. Try refining your search terms.";
        } catch (\Throwable $e) {
            return 'Search request failed: '.$e->getMessage();
        }
    }
}
