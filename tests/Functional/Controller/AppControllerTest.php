<?php

declare(strict_types=1);

namespace App\Tests\Functional\Controller;

use App\Controller\App\AppController;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class AppControllerTest extends WebTestCase
{
    /**
     * @return iterable<array{0: string}>
     *
     * @see AppController::composer()
     * @see AppController::home()
     */
    public static function provideTestSimplePage(): iterable
    {
        yield ['/'];
    }

    #[DataProvider('provideTestSimplePage')]
    public function testSimplePage(string $page): void
    {
        $client = self::createClient();
        $client->request('GET', $page);
        self::assertResponseIsSuccessful(sprintf('Page %s is not successfull.', $page));
    }
    //
    //    private const FORM_SUBMIT_BUTTON_ID = 'register_form_save';
    //    /**
    //     * @see AppController::form()
    //     */
    //    public function testFormValidationErrors(): void
    //    {
    //        $client = self::createClient();
    //        $crawler = $client->request('GET', '/form');
    //        self::assertResponseIsSuccessful();
    //
    //        $form = $crawler->selectButton(self::FORM_SUBMIT_BUTTON_ID)->form();
    //        $client->submit($form);
    //        self::assertResponseIsUnprocessable();
    //    }
    //
    //    /**
    //     * @see AppController::form()
    //     */
    //    public function testFormSuccess(): void
    //    {
    //        $client = self::createClient();
    //        $crawler = $client->request('GET', '/form');
    //        self::assertResponseIsSuccessful();
    //
    //        $form = $crawler->selectButton(self::FORM_SUBMIT_BUTTON_ID)->form();
    //        $client->submit($form, [
    //            $form->getName() . '[name]' => 'COil',
    //            $form->getName() . '[email]' => 'user@example.com',
    //            $form->getName() . '[country]' => 'FR',
    //            $form->getName() . '[currency]' => 'EUR',
    //            $form->getName() . '[birthday]' => '2003-03-12',
    //            $form->getName() . '[fruit]' => 1,
    //        ]);
    //        self::assertResponseIsSuccessful();
    //    }
}
