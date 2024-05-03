<?php

declare(strict_types=1);

namespace App\Dto;

use App\Entity\Offer;
use App\Enum\JerseyType;
use App\Enum\JerseyYears;

class DisplayJerseyDto
{
    public string $clubName;
    public JerseyYears $year;
    public JerseyType $type;
    public string $picture;
    /** @var Offer[] */
    public array $offers = [];
}
