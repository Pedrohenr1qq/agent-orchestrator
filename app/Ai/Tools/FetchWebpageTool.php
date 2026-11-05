<?php

namespace App\Ai\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Support\Facades\Http;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class FetchWebpageTool implements Tool
{
    public function description(): Stringable|string
    {
        return 'Fetch and read the text content of a public webpage or article URL to extract knowledge and references.';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'url' => $schema->string()
                ->description('The full HTTP or HTTPS URL of the webpage to fetch')
                ->required(),
        ];
    }

    public function handle(Request $request): Stringable|string
    {
        $url = $request['url'];

        if (! filter_var($url, FILTER_VALIDATE_URL)) {
            return "Error: Invalid URL provided: {$url}";
        }

        try {
            $response = Http::withUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
                ->timeout(15)
                ->get($url);

            if (! $response->successful()) {
                return "Error: Failed to fetch webpage (HTTP status {$response->status()})";
            }

            $html = $response->body();

            // Strip scripts, styles, iframes, and svg tags
            $clean = preg_replace('/<script\b[^>]*>(.*?)<\/script>/is', '', $html);
            $clean = preg_replace('/<style\b[^>]*>(.*?)<\/style>/is', '', $clean);
            $clean = preg_replace('/<svg\b[^>]*>(.*?)<\/svg>/is', '', $clean);
            $clean = preg_replace('/<iframe\b[^>]*>(.*?)<\/iframe>/is', '', $clean);
            $clean = preg_replace('/<nav\b[^>]*>(.*?)<\/nav>/is', '', $clean);
            $clean = preg_replace('/<footer\b[^>]*>(.*?)<\/footer>/is', '', $clean);

            // Convert breaks and paragraphs to newlines
            $clean = preg_replace('/<(p|br|div|h1|h2|h3|h4|li)\b[^>]*>/i', "\n", $clean);

            // Strip all remaining tags
            $text = strip_tags($clean);

            // Collapse multiple spaces and blank lines
            $text = preg_replace('/[ \t]+/', ' ', $text);
            $text = preg_replace('/\n\s*\n+/', "\n\n", $text);
            $text = trim($text);

            if (empty($text)) {
                return "The webpage at {$url} loaded successfully, but contained no readable text.";
            }

            // Truncate to first 6,000 characters if very long
            if (strlen($text) > 6000) {
                $text = substr($text, 0, 6000)."\n\n...[Content truncated for length]...";
            }

            return "Webpage Content from {$url}:\n\n".$text;
        } catch (\Throwable $e) {
            return 'Failed to fetch webpage: '.$e->getMessage();
        }
    }
}
