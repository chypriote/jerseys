<?php

declare(strict_types=1);

namespace App\Enum;

enum PaymentMethod: string
{
    case CREDIT_CARD = 'credit_card';
    case PAYPAL = 'paypal';
    case BANK_TRANSFER = 'bank_transfer';
    case WESTERN_UNION = 'western_union';
    case ZELLE = 'zelle';
    case WISE = 'wise';
    case SOFORT = 'sofort';
    case WECHAT = 'wechat';
    case ALIEXPRESS = 'aliexpress';
}
