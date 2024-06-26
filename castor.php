<?php

// Until the 1.x Castor version the API may be unstable
// it script was tested with Castor 0.10.0

declare(strict_types=1);

use Castor\Attribute\AsTask;
use Symfony\Component\Console\Command\Command;

use function Castor\io;
use function Castor\parallel;
use function Castor\run;
use function Castor\task;

/**
 * Don't display the description when using a parent command context.
 */
function title(string $title, ?Command $command = null): void
{
    io()->title($title.($command !== null ? ': '.$command->getDescription() : ''));
}

function success(): void
{
    io()->success('Done!');
}

function aborted(): void
{
    io()->warning('Aborted.');
}

#[AsTask(namespace: 'symfony', description: 'Serve the application with the Symfony binary', )]
function start(): void
{
    title(__FUNCTION__, task());
    run('symfony serve --daemon', quiet: false);
    success();
}

#[AsTask(namespace: 'symfony', description: 'Stop the web server')]
function stop(): void
{
    title(__FUNCTION__, task());
    run('symfony server:stop', quiet: false);
    success();
}

#[AsTask(namespace: 'symfony', description: 'Switch to the production environment')]
function go_prod(): void
{
    title(__FUNCTION__, task());
    if (io()->confirm('Are you sure you want to switch to the production environment? This will overwrite your .env.local file', false)) {
        run('cp .env.local.dist .env.local', quiet: false);
        run('php bin/console asset-map:compile', quiet: false);
        success();

        return;
    }

    aborted();
}

#[AsTask(namespace: 'symfony', description: 'Switch to the development environment')]
function go_dev(): void
{
    title(__FUNCTION__, task());
    if (io()->confirm('Are you sure you want to switch to the development environment? This will delete your .env.local file', false)) {
        run('rm -f .env.local', quiet: false);
        run('rm -rf ./public/assets/*', quiet: false);
        success();

        return;
    }

    aborted();
}

#[AsTask(namespace: 'symfony', description: 'Purge all Symfony cache and logs')]
function purge(): void
{
    title(__FUNCTION__, task());
    run('rm -rf ./var/cache/* ./var/logs/* ./var/coverage/*', quiet: false);
    success();
}

#[AsTask(namespace: 'symfony', description: 'Cache clear and warmup')]
function cache(): void
{
    title(__FUNCTION__, task());
    run('php bin/console cache:clear', quiet: false);
    run('php bin/console cache:warmup', quiet: false);
    success();
}

#[AsTask(name: 'all', namespace: 'test', description: 'Run all PHPUnit tests')]
function test(): void
{
    title(__FUNCTION__, task());
    run('php vendor/bin/phpunit', quiet: false);
    io()->writeln('');
    success();
}

#[AsTask(namespace: 'test', description: 'Generate the HTML PHPUnit code coverage report (stored in var/coverage)')]
function coverage(): void
{
    title(__FUNCTION__, task());
    run('php -d xdebug.enable=1 -d memory_limit=-1 vendor/bin/phpunit --coverage-html=var/coverage',
        environment: [
            'XDEBUG_MODE' => 'coverage',
        ],
        quiet: false
    );
    run('php bin/coverage-checker.php var/coverage/clover.xml 100', quiet: false);
    success();
}

#[AsTask(namespace: 'test', description: 'Open the PHPUnit code coverage report (var/coverage/index.html)')]
function cov_report(): void
{
    title(__FUNCTION__, task());
    run('open var/coverage/index.html', quiet: true);
    success();
}

#[AsTask(namespace: 'cs', description: 'Run Rector')]
function rector(): void
{
    title(__FUNCTION__, task());
    run('php vendor/bin/rector process --memory-limit 1G -vvv', quiet: false);
    success();
}

#[AsTask(namespace: 'cs', description: 'Run PHPStan')]
function stan(): void
{
    title(__FUNCTION__, task());
    run('php vendor/bin/phpstan analyse -c phpstan.neon --memory-limit 1G -vvv', quiet: false);
    success();
}

#[AsTask(namespace: 'cs', description: 'Fix PHP files with php-cs-fixer (ignore PHP 8.2 warning)')]
function fix_php(): void
{
    title(__FUNCTION__, task());
    run('php vendor/bin/php-cs-fixer fix --allow-risky=yes',
        environment: [
            'PHP_CS_FIXER_IGNORE_ENV' => 1,
        ],
        quiet: false
    );
    success();
}

#[AsTask(name: 'all', namespace: 'cs', description: 'Run all CS checks')]
function cs_all(): void
{
    title(__FUNCTION__, task());
    fix_php();
    rector();
    stan();
}

#[AsTask(name: 'container', namespace: 'lint', description: 'Lint the Symfony DI container')]
function lint_container(): void
{
    title(__FUNCTION__, task());
    run('php bin/console lint:container', quiet: false);
    success();
}

#[AsTask(name: 'twig', namespace: 'lint', description: 'Lint Twig files')]
function lint_twig(): void
{
    title(__FUNCTION__, task());
    run('php bin/console lint:twig templates/', quiet: false);
    success();
}

#[AsTask(name: 'yaml', namespace: 'lint', description: 'Lint Yaml files')]
function lint_yaml(): void
{
    title(__FUNCTION__, task());
    run('php bin/console lint:yaml --parse-tags config/', quiet: false);
    success();
}

#[AsTask(name: 'all', namespace: 'lint', description: 'Run all lints')]
function lint_all(): void
{
    title(__FUNCTION__, task());
    parallel(
        fn () => lint_container(),
        fn () => lint_twig(),
        fn () => lint_yaml(),
    );
}

#[AsTask(name: 'all', namespace: 'ci', description: 'Run CI locally')]
function ci(): void
{
    title(__FUNCTION__, task());
    lint_all();
    cs_all();
    test();
}

#[AsTask(name: 'versions', namespace: 'helpers', description: 'Output current stack versions')]
function versions(): void
{
    title(__FUNCTION__, task());
    io()->note('PHP');
    run('php -v', quiet: false);
    io()->newLine();

    io()->note('Composer');
    run('composer --version', quiet: false);
    io()->newLine();

    io()->note('Symfony');
    run('php bin/console --version', quiet: false);
    io()->newLine();

    io()->note('PHPUnit');
    run('php vendor/bin/phpunit --version', quiet: false);

    io()->note('PHPStan');
    run('php vendor/bin/phpstan --version', quiet: false);
    io()->newLine();

    io()->note('php-cs-fixer');
    run('php vendor/bin/php-cs-fixer --version', quiet: false);
    io()->newLine();

    io()->note('rector');
    run('php vendor/bin/rector --version', quiet: false);
    io()->newLine();

    success();
}

#[AsTask(name: 'check-requirements', namespace: 'helpers', description: 'Checks requirements for running Symfony')]
function check_requirements(): void
{
    title(__FUNCTION__, task());
    run('php vendor/bin/requirements-checker', quiet: false);
    success();
}
