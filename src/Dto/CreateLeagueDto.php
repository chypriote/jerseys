<?php

namespace App\Dto;

class CreateLeagueDto
{
    public string $name;

    public ?string $slug;

    public ?string $logo = null;
}
