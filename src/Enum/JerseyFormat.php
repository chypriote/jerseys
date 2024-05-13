<?php

declare(strict_types=1);

namespace App\Enum;

use Symfony\Contracts\Translation\TranslatableInterface;
use Symfony\Contracts\Translation\TranslatorInterface;

enum JerseyFormat: string implements TranslatableInterface
{
    case FAN = 'fan';
    case PLAYER = 'player';
    case KID = 'kid';
    case WOMAN = 'woman';

    public function trans(TranslatorInterface $translator, ?string $locale = null): string
    {
        return match ($this) {
            self::FAN => $translator->trans('jersey.format.'.self::FAN->value, locale: $locale),
            self::PLAYER => $translator->trans('jersey.format.'.self::PLAYER->value, locale: $locale),
            self::KID => $translator->trans('jersey.format.'.self::KID->value, locale: $locale),
            self::WOMAN => $translator->trans('jersey.format.'.self::WOMAN->value, locale: $locale),
        };
    }
}
