<?php

declare(strict_types=1);

namespace App\Twig\Components\Home;

use App\Entity\Club;
use Symfony\UX\TwigComponent\Attribute\AsTwigComponent;

#[AsTwigComponent]
class ClubDisplay
{
    public Club $club;
}
