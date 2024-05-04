<?php

declare(strict_types=1);

namespace App\Test\Controller;

use App\Entity\Offer;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\EntityRepository;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class OfferControllerTest extends WebTestCase
{
    private KernelBrowser $client;
    private EntityManagerInterface $manager;
    private EntityRepository $repository;
    private string $path = '/offer/';

    protected function setUp(): void
    {
        $this->client = static::createClient();
        $this->manager = static::getContainer()->get('doctrine')->getManager();
        $this->repository = $this->manager->getRepository(Offer::class);

        foreach ($this->repository->findAll() as $object) {
            $this->manager->remove($object);
        }

        $this->manager->flush();
    }

    public function testIndex(): void
    {
        $this->client->request('GET', $this->path);

        self::assertResponseStatusCodeSame(200);
        self::assertPageTitleContains('Offer index');

        // Use the $crawler to perform additional assertions e.g.
        // self::assertSame('Some text on the page', $crawler->filter('.p')->first());
    }

    public function testNew(): void
    {
        $this->markTestIncomplete();
        $this->client->request('GET', sprintf('%snew', $this->path));

        self::assertResponseStatusCodeSame(200);

        $this->client->submitForm('Save', [
            'offer[url]' => 'Testing',
            'offer[price]' => 'Testing',
            'offer[formats]' => 'Testing',
            'offer[createdAt]' => 'Testing',
            'offer[updatedAt]' => 'Testing',
            'offer[seller]' => 'Testing',
            'offer[jersey]' => 'Testing',
        ]);

        self::assertResponseRedirects($this->path);

        self::assertSame(1, $this->repository->count([]));
    }

    public function testShow(): void
    {
        $this->markTestIncomplete();
        $fixture = new Offer();
        $fixture->setUrl('My Title');
        $fixture->setPrice('My Title');
        $fixture->setFormats('My Title');
        $fixture->setCreatedAt('My Title');
        $fixture->setUpdatedAt('My Title');
        $fixture->setSeller('My Title');
        $fixture->setJersey('My Title');

        $this->manager->persist($fixture);
        $this->manager->flush();

        $this->client->request('GET', sprintf('%s%s', $this->path, $fixture->getId()));

        self::assertResponseStatusCodeSame(200);
        self::assertPageTitleContains('Offer');

        // Use assertions to check that the properties are properly displayed.
    }

    public function testEdit(): void
    {
        $this->markTestIncomplete();
        $fixture = new Offer();
        $fixture->setUrl('Value');
        $fixture->setPrice('Value');
        $fixture->setFormats('Value');
        $fixture->setCreatedAt('Value');
        $fixture->setUpdatedAt('Value');
        $fixture->setSeller('Value');
        $fixture->setJersey('Value');

        $this->manager->persist($fixture);
        $this->manager->flush();

        $this->client->request('GET', sprintf('%s%s/edit', $this->path, $fixture->getId()));

        $this->client->submitForm('Update', [
            'offer[url]' => 'Something New',
            'offer[price]' => 'Something New',
            'offer[formats]' => 'Something New',
            'offer[createdAt]' => 'Something New',
            'offer[updatedAt]' => 'Something New',
            'offer[seller]' => 'Something New',
            'offer[jersey]' => 'Something New',
        ]);

        self::assertResponseRedirects('/offer/');

        $fixture = $this->repository->findAll();

        self::assertSame('Something New', $fixture[0]->getUrl());
        self::assertSame('Something New', $fixture[0]->getPrice());
        self::assertSame('Something New', $fixture[0]->getFormats());
        self::assertSame('Something New', $fixture[0]->getCreatedAt());
        self::assertSame('Something New', $fixture[0]->getUpdatedAt());
        self::assertSame('Something New', $fixture[0]->getSeller());
        self::assertSame('Something New', $fixture[0]->getJersey());
    }

    public function testRemove(): void
    {
        $this->markTestIncomplete();
        $fixture = new Offer();
        $fixture->setUrl('Value');
        $fixture->setPrice('Value');
        $fixture->setFormats('Value');
        $fixture->setCreatedAt('Value');
        $fixture->setUpdatedAt('Value');
        $fixture->setSeller('Value');
        $fixture->setJersey('Value');

        $this->manager->persist($fixture);
        $this->manager->flush();

        $this->client->request('GET', sprintf('%s%s', $this->path, $fixture->getId()));
        $this->client->submitForm('Delete');

        self::assertResponseRedirects('/offer/');
        self::assertSame(0, $this->repository->count([]));
    }
}
