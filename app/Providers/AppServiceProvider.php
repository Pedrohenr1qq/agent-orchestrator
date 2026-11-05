<?php

namespace App\Providers;

use App\Models\SystemSetting;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->bootSettings();
    }

    /**
     * Dynamically inject system settings from database into config.
     */
    protected function bootSettings(): void
    {
        try {
            if (! Schema::hasTable('system_settings')) {
                return;
            }

            $settings = SystemSetting::all()->pluck('value', 'key');

            if ($key = $settings->get('gemini_api_key')) {
                config(['ai.providers.gemini.key' => $key]);
            }
            if ($key = $settings->get('anthropic_api_key')) {
                config(['ai.providers.anthropic.key' => $key]);
            }
            if ($key = $settings->get('openai_api_key')) {
                config(['ai.providers.openai.key' => $key]);
            }
            if ($key = $settings->get('deepseek_api_key')) {
                config(['ai.providers.deepseek.key' => $key]);
            }
            if ($url = $settings->get('ollama_url')) {
                config(['ai.providers.ollama.url' => $url]);
            }
            if ($key = $settings->get('tavily_api_key')) {
                config(['services.tavily.key' => $key]);
            }
        } catch (\Throwable $e) {
            // Gracefully ignore during initial boots or migrations
        }
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
