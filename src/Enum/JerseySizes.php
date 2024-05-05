<?php

declare(strict_types=1);

namespace App\Enum;

use Symfony\Contracts\Translation\TranslatableInterface;
use Symfony\Contracts\Translation\TranslatorInterface;

enum JerseySizes: string implements TranslatableInterface
{
    case SIZE_XS = 'XS';
    case SIZE_S = 'S';
    case SIZE_M = 'M';
    case SIZE_L = 'L';
    case SIZE_XL = 'XL';
    case SIZE_XXL = '2XL';
    case SIZE_XXXL = '3XL';
    case SIZE_XXXXL = '4XL';
    case SIZE_XXXXXL = '5XL';

    public function trans(TranslatorInterface $translator, ?string $locale = null): string
    {
        return $this->value;
    }
}
