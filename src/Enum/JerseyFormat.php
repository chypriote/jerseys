<?php

declare(strict_types=1);

namespace App\Enum;

enum JerseyFormat: string
{
    case FAN = 'fan';
    case PLAYER = 'player';
    case KID = 'kid';
}
