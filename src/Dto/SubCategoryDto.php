<?php

declare(strict_types=1);

namespace App\Dto;

class SubCategoryDto
{
    public string $name;
    public string $logo;
    public string $routeName;
    /** @var string[] */
    public array $routeParams;
}
