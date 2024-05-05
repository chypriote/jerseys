<?php

declare(strict_types=1);

namespace App\Enum;

use Symfony\Contracts\Translation\TranslatableInterface;
use Symfony\Contracts\Translation\TranslatorInterface;

enum JerseyYears: string implements TranslatableInterface
{
    case YEAR_2025 = '2025';
    case YEAR_2024_2025 = '2024-2025';
    case YEAR_2024 = '2024';
    case YEAR_2023_2024 = '2023-2024';
    case YEAR_2023 = '2023';
    case YEAR_2022_2023 = '2022-2023';

    public function trans(TranslatorInterface $translator, ?string $locale = null): string
    {
        return match ($this) {
            self::YEAR_2025 => $translator->trans('jersey.year.'.self::YEAR_2025->value, locale: $locale),
            self::YEAR_2024_2025 => $translator->trans('jersey.year.'.self::YEAR_2024_2025->value, locale: $locale),
            self::YEAR_2024 => $translator->trans('jersey.year.'.self::YEAR_2024->value, locale: $locale),
            self::YEAR_2023_2024 => $translator->trans('jersey.year.'.self::YEAR_2023_2024->value, locale: $locale),
            self::YEAR_2023 => $translator->trans('jersey.year.'.self::YEAR_2023->value, locale: $locale),
            self::YEAR_2022_2023 => $translator->trans('jersey.year.'.self::YEAR_2022_2023->value, locale: $locale),
        };
    }
}
