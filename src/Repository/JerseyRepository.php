<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Jersey;
use App\Entity\League;
use Doctrine\Bundle\DoctrineBundle\Repository\LazyServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends LazyServiceEntityRepository<Jersey>.
 *
 * @method Jersey|null find($id, $lockMode = null, $lockVersion = null)
 * @method Jersey|null findOneBy(array $criteria, array $orderBy = null)
 * @method Jersey[]    findAll()
 * @method Jersey[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class JerseyRepository extends LazyServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Jersey::class);
    }

    /** @return Jersey[] */
    public function findByLeague(League $league): array
    {
        return $this->createQueryBuilder('j')
            ->join('j.club', 'c')
            ->where('c.league = :league')
            ->setParameter('league', $league)
            ->getQuery()
            ->getResult();
    }
}
