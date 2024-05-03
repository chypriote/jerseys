<?php

declare(strict_types=1);

namespace App\Dto;

class CreateLeagueDto
{
    public string $name;

    public ?string $slug = null;

    public ?string $logo = null;
}
