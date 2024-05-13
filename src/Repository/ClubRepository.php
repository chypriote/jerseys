<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Club;
use Doctrine\Bundle\DoctrineBundle\Repository\LazyServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends LazyServiceEntityRepository<Club>.
 *
 * @method Club|null find($id, $lockMode = null, $lockVersion = null)
 * @method Club|null findOneBy(array $criteria, array $orderBy = null)
 * @method Club[]    findAll()
 * @method Club[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class ClubRepository extends LazyServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Club::class);
    }

    /** @return Club[] */
    public function findAllWithJersey(): array
    {
        /** @var Club[] */
        return $this->createQueryBuilder('c')
            ->leftJoin('c.jerseys', 'j')
            ->orderBy('c.updatedAt', 'desc')
            ->groupBy('c.id')
            ->setMaxResults(10)
            ->getQuery()
            ->getResult();
    }
}
