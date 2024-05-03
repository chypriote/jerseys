<?php

declare(strict_types=1);

namespace App\Enum;

use Symfony\Contracts\Translation\TranslatableInterface;
use Symfony\Contracts\Translation\TranslatorInterface;

enum JerseyType: string implements TranslatableInterface
{
    case HOME = 'home';
    case AWAY = 'away';
    case THIRD = 'third';
    case FOURTH = 'fourth';
    case SPECIAL = 'special';

    public function trans(TranslatorInterface $translator, ?string $locale = null): string
    {
        return match ($this) {
            self::HOME => $translator->trans('jersey.type.'.self::HOME->value, locale: $locale),
            self::AWAY => $translator->trans('jersey.type.'.self::AWAY->value, locale: $locale),
            self::THIRD => $translator->trans('jersey.type.'.self::THIRD->value, locale: $locale),
            self::FOURTH => $translator->trans('jersey.type.'.self::FOURTH->value, locale: $locale),
            self::SPECIAL => $translator->trans('jersey.type.'.self::SPECIAL->value, locale: $locale),
        };
    }
}
