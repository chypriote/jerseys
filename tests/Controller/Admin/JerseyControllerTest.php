<?php

declare(strict_types=1);

namespace App\Tests\Controller\Admin;

use App\Entity\Jersey;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\EntityRepository;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class JerseyControllerTest extends WebTestCase
{
    private KernelBrowser $client;
    private EntityManagerInterface $manager;
    /** @var EntityRepository<Jersey> */
    private EntityRepository $repository;
    private string $path = '/admin/jerseys/';

    protected function setUp(): void
    {
        $this->client = static::createClient();
        $this->manager = static::getContainer()->get('doctrine')->getManager();
        $this->repository = $this->manager->getRepository(Jersey::class);

        foreach ($this->repository->findAll() as $object) {
            $this->manager->remove($object);
        }

        $this->manager->flush();
    }

    public function testIndex(): void
    {
        $this->client->request(Method::GET, $this->path);

        self::assertResponseStatusCodeSame(200);
        self::assertPageTitleContains('Jersey index');

        // Use the $crawler to perform additional assertions e.g.
        // self::assertSame('Some text on the page', $crawler->filter('.p')->first());
    }

    public function testNew(): void
    {
        $this->client->request(Method::GET, sprintf('%snew', $this->path));

        self::assertResponseStatusCodeSame(200);

        $this->client->submitForm('Save', [
            'jersey[year]' => 'Testing',
            'jersey[slug]' => 'Testing',
            'jersey[type]' => 'Testing',
            'jersey[picture]' => 'Testing',
            'jersey[clubs]' => 'Testing',
        ]);

        self::assertResponseRedirects($this->path);

        self::assertSame(1, $this->repository->count([]));
    }

    public function testShow(): void
    {
        $this->markTestIncomplete();
        $fixture = new Jersey();
        $fixture->setYear('My Title');
        $fixture->setSlug('My Title');
        $fixture->setType('My Title');
        $fixture->setPicture('My Title');
        $fixture->setClub('My Title');

        $this->manager->persist($fixture);
        $this->manager->flush();

        $this->client->request(Method::GET, sprintf('%s%s', $this->path, $fixture->getId()));

        self::assertResponseStatusCodeSame(200);
        self::assertPageTitleContains('Jersey');

        // Use assertions to check that the properties are properly displayed.
    }

    public function testEdit(): void
    {
        $this->markTestIncomplete();
        $fixture = new Jersey();
        $fixture->setYear('Value');
        $fixture->setType('Value');
        $fixture->setPicture('Value');
        $fixture->setClub('Value');

        $this->manager->persist($fixture);
        $this->manager->flush();

        $this->client->request(Method::GET, sprintf('%s%s/edit', $this->path, $fixture->getId()));

        $this->client->submitForm('Update', [
            'jersey[year]' => 'Something New',
            'jersey[slug]' => 'Something New',
            'jersey[type]' => 'Something New',
            'jersey[picture]' => 'Something New',
            'jersey[clubs]' => 'Something New',
        ]);

        self::assertResponseRedirects('/jersey/');

        $fixture = $this->repository->findAll();

        self::assertSame('Something New', $fixture[0]->getYear());
        self::assertSame('Something New', $fixture[0]->getSlug());
        self::assertSame('Something New', $fixture[0]->getType());
        self::assertSame('Something New', $fixture[0]->getPicture());
        self::assertSame('Something New', $fixture[0]->getClub());
    }

    public function testRemove(): void
    {
        $this->markTestIncomplete();
        $fixture = new Jersey();
        $fixture->setYear('Value');
        $fixture->setType('Value');
        $fixture->setPicture('Value');
        $fixture->setClub('Value');

        $this->manager->persist($fixture);
        $this->manager->flush();

        $this->client->request(Method::GET, sprintf('%s%s', $this->path, $fixture->getId()));
        $this->client->submitForm('Delete');

        self::assertResponseRedirects('/jersey/');
        self::assertSame(0, $this->repository->count([]));
    }
}
