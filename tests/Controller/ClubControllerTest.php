<?php

declare(strict_types=1);

namespace App\Test\Controller;

use App\Entity\Club;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\EntityRepository;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class ClubControllerTest extends WebTestCase
{
    private KernelBrowser $client;
    private EntityManagerInterface $manager;
    private EntityRepository $repository;
    private string $path = '/clubs/';

    protected function setUp(): void
    {
        $this->client = static::createClient();
        $this->manager = static::getContainer()->get('doctrine')->getManager();
        $this->repository = $this->manager->getRepository(Club::class);

        foreach ($this->repository->findAll() as $object) {
            $this->manager->remove($object);
        }

        $this->manager->flush();
    }

    public function testIndex(): void
    {
        $this->client->request(Method::GET, $this->path);

        self::assertResponseStatusCodeSame(200);
        self::assertPageTitleContains('Club index');

        // Use the $crawler to perform additional assertions e.g.
        // self::assertSame('Some text on the page', $crawler->filter('.p')->first());
    }

    public function testNew(): void
    {
        $this->markTestIncomplete();
        $this->client->request(Method::GET, sprintf('%snew', $this->path));

        self::assertResponseStatusCodeSame(200);

        $this->client->submitForm('Save', [
            'clubs[name]' => 'Testing',
            'clubs[slug]' => 'Testing',
            'clubs[country]' => 'Testing',
            'clubs[logo]' => 'Testing',
            'clubs[deletedAt]' => 'Testing',
            'clubs[createdAt]' => 'Testing',
            'clubs[updatedAt]' => 'Testing',
            'clubs[league]' => 'Testing',
        ]);

        self::assertResponseRedirects($this->path);

        self::assertSame(1, $this->repository->count([]));
    }

    public function testShow(): void
    {
        $this->markTestIncomplete();
        $fixture = new Club();
        $fixture->setName('My Title');
        $fixture->setSlug('My Title');
        $fixture->setCountry('My Title');
        $fixture->setLogo('My Title');
        $fixture->setDeletedAt('My Title');
        $fixture->setCreatedAt('My Title');
        $fixture->setUpdatedAt('My Title');
        $fixture->setLeague('My Title');

        $this->manager->persist($fixture);
        $this->manager->flush();

        $this->client->request(Method::GET, sprintf('%s%s', $this->path, $fixture->getId()));

        self::assertResponseStatusCodeSame(200);
        self::assertPageTitleContains('Club');

        // Use assertions to check that the properties are properly displayed.
    }

    public function testEdit(): void
    {
        $this->markTestIncomplete();
        $fixture = new Club();
        $fixture->setName('Value');
        $fixture->setSlug('Value');
        $fixture->setCountry('Value');
        $fixture->setLogo('Value');
        $fixture->setDeletedAt('Value');
        $fixture->setCreatedAt('Value');
        $fixture->setUpdatedAt('Value');
        $fixture->setLeague('Value');

        $this->manager->persist($fixture);
        $this->manager->flush();

        $this->client->request(Method::GET, sprintf('%s%s/edit', $this->path, $fixture->getId()));

        $this->client->submitForm('Update', [
            'clubs[name]' => 'Something New',
            'clubs[slug]' => 'Something New',
            'clubs[country]' => 'Something New',
            'clubs[logo]' => 'Something New',
            'clubs[deletedAt]' => 'Something New',
            'clubs[createdAt]' => 'Something New',
            'clubs[updatedAt]' => 'Something New',
            'clubs[league]' => 'Something New',
        ]);

        self::assertResponseRedirects('/clubs/');

        $fixture = $this->repository->findAll();

        self::assertSame('Something New', $fixture[0]->getName());
        self::assertSame('Something New', $fixture[0]->getSlug());
        self::assertSame('Something New', $fixture[0]->getCountry());
        self::assertSame('Something New', $fixture[0]->getLogo());
        self::assertSame('Something New', $fixture[0]->getDeletedAt());
        self::assertSame('Something New', $fixture[0]->getCreatedAt());
        self::assertSame('Something New', $fixture[0]->getUpdatedAt());
        self::assertSame('Something New', $fixture[0]->getLeague());
    }

    public function testRemove(): void
    {
        $this->markTestIncomplete();
        $fixture = new Club();
        $fixture->setName('Value');
        $fixture->setSlug('Value');
        $fixture->setCountry('Value');
        $fixture->setLogo('Value');
        $fixture->setDeletedAt('Value');
        $fixture->setCreatedAt('Value');
        $fixture->setUpdatedAt('Value');
        $fixture->setLeague('Value');

        $this->manager->persist($fixture);
        $this->manager->flush();

        $this->client->request(Method::GET, sprintf('%s%s', $this->path, $fixture->getId()));
        $this->client->submitForm('Delete');

        self::assertResponseRedirects('/clubs/');
        self::assertSame(0, $this->repository->count([]));
    }
}
