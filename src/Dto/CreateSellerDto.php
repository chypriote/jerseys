<?php

declare(strict_types=1);

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

class CreateSellerDto
{
    #[Assert\NotNull]
    public string $name;

    public ?string $slug = null;

    #[Assert\NotNull]
    public string $url;

    #[Assert\NotBlank]
    public string $logo;
}
