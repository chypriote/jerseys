<?php

declare(strict_types=1);

namespace App\Twig\Components\Home;

use App\Entity\Seller;
use Symfony\UX\TwigComponent\Attribute\AsTwigComponent;

#[AsTwigComponent]
class SellerDisplay
{
    public Seller $seller;
}
