<?php

declare(strict_types=1);

namespace App\Dto;

use App\Entity\League;
use Symfony\Component\Validator\Constraints as Assert;

final class CreateClubDto
{
    #[Assert\NotBlank]
    public string $name;

    #[Assert\NotNull]
    #[Assert\Country]
    public string $country;

    #[Assert\NotBlank]
    public string $logo;

    public League $league;
}
