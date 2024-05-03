<?php

declare(strict_types=1);

namespace App\Controller\App;

use App\Helper\StringHelper;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\AsController;
use Symfony\Component\Routing\Attribute\Route;

#[AsController]
final class SlugifyAcfion extends AbstractController
{
    #[Route(path: '/api/slugify', name: 'slugify')]
    public function __invoke(Request $request, StringHelper $stringHelper): Response
    {
        return $this->json([
            'slug' => $stringHelper->slugify($request->query->getString('title')),
        ]);
    }
}
