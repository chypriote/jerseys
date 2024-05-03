<?php

declare(strict_types=1);

namespace App\Enum;

enum UserRoles: string
{
    case ADMIN = 'ROLE_ADMIN';
    case USER = 'ROLE_USER';
}
