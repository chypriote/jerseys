<?php

declare(strict_types=1);

namespace App\Dto;

use App\Entity\Club;
use App\Enum\JerseyType;
use App\Enum\JerseyYears;
use Symfony\Component\Validator\Constraints as Assert;

final class CreateJerseyDto
{
    #[Assert\NotNull]
    public Club $club;

    public ?string $slug = null;
    #[Assert\NotBlank]
    public JerseyYears $year;

    #[Assert\NotBlank]
    public JerseyType $type;

    #[Assert\NotBlank]
    public string $picture;
}
