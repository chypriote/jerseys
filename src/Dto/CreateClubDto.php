<?php

declare(strict_types=1);

namespace App\Dto;

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
}
