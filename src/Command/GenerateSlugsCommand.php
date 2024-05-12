<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\Jersey;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:generate:slugs',
    description: 'Regenerate slugs for each jersey.',
)]
class GenerateSlugsCommand extends Command
{
    public function __construct(private readonly EntityManagerInterface $entityManager)
    {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $jerseys = $this->entityManager->getRepository(Jersey::class)->findAll();
        foreach ($jerseys as $jersey) {
            //            $jersey->setSlug(null);
            $this->entityManager->flush();
        }
        $io->success('Slugs regenerated successfully.');

        return Command::SUCCESS;
    }
}
