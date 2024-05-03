<?php

declare(strict_types=1);

namespace App\Tests\Controller\Admin;

use App\Entity\Seller;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\EntityRepository;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class SellerControllerTest extends WebTestCase
{
    private KernelBrowser $client;
    private EntityManagerInterface $manager;
    /** @var EntityRepository<Seller> */
    private EntityRepository $repository;
    private string $path = '/admin/sellers/';

    protected function setUp(): void
    {
        $this->client = static::createClient();
        $this->manager = static::getContainer()->get('doctrine')->getManager();
        $this->repository = $this->manager->getRepository(Seller::class);

        foreach ($this->repository->findAll() as $object) {
            $this->manager->remove($object);
        }

        $this->manager->flush();
    }

    public function testIndex(): void
    {
        $this->client->request(Method::GET, $this->path);

        self::assertResponseStatusCodeSame(200);
        self::assertPageTitleContains('Seller index');

        // Use the $crawler to perform additional assertions e.g.
        // self::assertSame('Some text on the page', $crawler->filter('.p')->first());
    }

    public function testNew(): void
    {
        $this->client->request(Method::GET, sprintf('%snew', $this->path));

        self::assertResponseStatusCodeSame(200);

        $this->client->submitForm('Save', [
            'seller[name]' => 'Testing',
            'seller[url]' => 'Testing',
            'seller[logo]' => 'Testing',
        ]);

        self::assertResponseRedirects($this->path);

        self::assertSame(1, $this->repository->count([]));
    }

    public function testShow(): void
    {
        $fixture = new Seller();
        $fixture->setName('My Title');
        $fixture->setUrl('My Title');
        $fixture->setLogo('My Title');

        $this->manager->persist($fixture);
        $this->manager->flush();

        $this->client->request(Method::GET, sprintf('%s%s', $this->path, $fixture->getId()));

        self::assertResponseStatusCodeSame(200);
        self::assertPageTitleContains('Seller');

        // Use assertions to check that the properties are properly displayed.
    }

    public function testEdit(): void
    {
        $fixture = new Seller();
        $fixture->setName('Value');
        $fixture->setUrl('Value');
        $fixture->setLogo('Value');

        $this->manager->persist($fixture);
        $this->manager->flush();

        $this->client->request(Method::GET, sprintf('%s%s/edit', $this->path, $fixture->getId()));

        $this->client->submitForm('Update', [
            'seller[name]' => 'Something New',
            'seller[url]' => 'Something New',
            'seller[logo]' => 'Something New',
        ]);

        self::assertResponseRedirects('/sellers/show/'.$fixture->getId());

        $fixture = $this->repository->findAll();

        self::assertSame('Something New', $fixture[0]->getName());
        self::assertSame('Something New', $fixture[0]->getUrl());
        self::assertSame('Something New', $fixture[0]->getLogo());
    }

    public function testRemove(): void
    {
        $fixture = new Seller();
        $fixture->setName('Value');
        $fixture->setUrl('Value');
        $fixture->setLogo('Value');

        $this->manager->persist($fixture);
        $this->manager->flush();

        $this->client->request(Method::GET, sprintf('%s%s', $this->path, $fixture->getId()));
        $this->client->submitForm('Delete');

        self::assertResponseRedirects('/sellers/');
        self::assertSame(0, $this->repository->count([]));
    }
}
